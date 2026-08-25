import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const CATEGORIES = new Set(['salud', 'familia', 'trabajo', 'fortaleza', 'agradecimiento', 'otra']);
const PRAYER_STATES = new Set(['new', 'praying', 'answered']);

let pool: Pool | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, max: 3 });
  return pool;
}

async function ensureTables() {
  await database().query(`CREATE TABLE IF NOT EXISTS prayer_requests (
    id BIGSERIAL PRIMARY KEY,
    display_name VARCHAR(80) NOT NULL DEFAULT 'Anónimo',
    category VARCHAR(30) NOT NULL DEFAULT 'otra',
    title VARCHAR(120) NOT NULL,
    body VARCHAR(1600) NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    prayer_state VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await database().query(`CREATE TABLE IF NOT EXISTS prayer_replies (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
    display_name VARCHAR(80) NOT NULL DEFAULT 'Anónimo',
    body VARCHAR(1000) NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await database().query('CREATE INDEX IF NOT EXISTS prayer_requests_created_idx ON prayer_requests (created_at DESC)');
  await database().query('CREATE INDEX IF NOT EXISTS prayer_replies_request_idx ON prayer_replies (request_id, created_at)');
}

function authorized(request: Request) {
  return Boolean(process.env.ADMIN_PIN && request.headers.get('authorization') === `Bearer ${process.env.ADMIN_PIN}`);
}

function safeName(value: unknown) {
  return String(value || '').trim().slice(0, 80) || 'Anónimo';
}

export async function GET(request: Request) {
  try {
    await ensureTables();
    const admin = new URL(request.url).searchParams.get('admin') === '1';
    if (admin && !authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const requests = await database().query(admin
      ? `SELECT id, display_name, category, title, body, is_approved, prayer_state, created_at
         FROM prayer_requests ORDER BY created_at DESC LIMIT 100`
      : `SELECT id, display_name, category, title, body, prayer_state, created_at
         FROM prayer_requests WHERE is_approved = TRUE ORDER BY created_at DESC LIMIT 50`);
    const replies = await database().query(admin
      ? `SELECT r.id, r.request_id, r.display_name, r.body, r.is_approved, r.created_at, p.title AS request_title
         FROM prayer_replies r JOIN prayer_requests p ON p.id = r.request_id ORDER BY r.created_at DESC LIMIT 300`
      : `SELECT r.id, r.request_id, r.display_name, r.body, r.created_at
         FROM prayer_replies r JOIN prayer_requests p ON p.id = r.request_id
         WHERE r.is_approved = TRUE AND p.is_approved = TRUE ORDER BY r.created_at ASC LIMIT 300`);
    return Response.json({ requests: requests.rows, replies: replies.rows });
  } catch {
    return Response.json({ requests: [], replies: [] });
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403 });
    const data = await request.json();
    if (String(data.website || '')) return Response.json({ ok: true }, { status: 201 });
    await ensureTables();
    const kind = data.kind === 'reply' ? 'reply' : 'request';
    const displayName = safeName(data.display_name);
    const body = String(data.body || '').trim().slice(0, kind === 'reply' ? 1000 : 1600);
    if (body.length < 5) return Response.json({ error: 'Message is too short' }, { status: 400 });

    if (kind === 'reply') {
      const requestId = Number(data.request_id);
      if (!Number.isInteger(requestId)) return Response.json({ error: 'Invalid request' }, { status: 400 });
      const parent = await database().query('SELECT 1 FROM prayer_requests WHERE id = $1 AND is_approved = TRUE', [requestId]);
      if (!parent.rowCount) return Response.json({ error: 'Request not found' }, { status: 404 });
      const duplicate = await database().query(`SELECT 1 FROM prayer_replies WHERE request_id = $1 AND display_name = $2 AND body = $3
        AND created_at >= NOW() - INTERVAL '5 minutes' LIMIT 1`, [requestId, displayName, body]);
      if (duplicate.rowCount) return Response.json({ error: 'Duplicate reply' }, { status: 429 });
      await database().query('INSERT INTO prayer_replies (request_id, display_name, body) VALUES ($1, $2, $3)', [requestId, displayName, body]);
      return Response.json({ ok: true, pending: true }, { status: 201 });
    }

    if (data.consent !== true) return Response.json({ error: 'Consent required' }, { status: 400 });
    const category = CATEGORIES.has(String(data.category)) ? String(data.category) : 'otra';
    const title = String(data.title || '').trim().slice(0, 120);
    if (title.length < 3) return Response.json({ error: 'Title is too short' }, { status: 400 });
    const duplicate = await database().query(`SELECT 1 FROM prayer_requests WHERE display_name = $1 AND body = $2
      AND created_at >= NOW() - INTERVAL '5 minutes' LIMIT 1`, [displayName, body]);
    if (duplicate.rowCount) return Response.json({ error: 'Duplicate request' }, { status: 429 });
    await database().query(`INSERT INTO prayer_requests (display_name, category, title, body)
      VALUES ($1, $2, $3, $4)`, [displayName, category, title, body]);
    return Response.json({ ok: true, pending: true }, { status: 201 });
  } catch {
    return Response.json({ error: 'Prayer could not be saved' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();
  const id = Number(data.id);
  if (!Number.isInteger(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });
  await ensureTables();
  if (data.kind === 'reply') {
    await database().query('UPDATE prayer_replies SET is_approved = $1 WHERE id = $2', [Boolean(data.is_approved), id]);
  } else {
    if (typeof data.is_approved === 'boolean') await database().query('UPDATE prayer_requests SET is_approved = $1 WHERE id = $2', [data.is_approved, id]);
    if (PRAYER_STATES.has(String(data.prayer_state))) await database().query('UPDATE prayer_requests SET prayer_state = $1 WHERE id = $2', [data.prayer_state, id]);
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  const kind = url.searchParams.get('kind');
  if (!Number.isInteger(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });
  await ensureTables();
  if (kind === 'reply') await database().query('DELETE FROM prayer_replies WHERE id = $1', [id]);
  else await database().query('DELETE FROM prayer_requests WHERE id = $1', [id]);
  return Response.json({ ok: true });
}
