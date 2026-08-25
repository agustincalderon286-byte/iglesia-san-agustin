import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

let pool: Pool | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, max: 3 });
  return pool;
}

async function ensureTable() {
  await database().query(`CREATE TABLE IF NOT EXISTS contact_messages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    contact VARCHAR(160) NOT NULL DEFAULT '',
    body VARCHAR(2000) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await database().query('CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC)');
}

function authorized(request: Request) {
  return Boolean(process.env.ADMIN_PIN && request.headers.get('authorization') === `Bearer ${process.env.ADMIN_PIN}`);
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403 });
    const data = await request.json();
    if (String(data.website || '')) return Response.json({ ok: true }, { status: 201 });
    const name = String(data.name || '').trim().slice(0, 80);
    const contact = String(data.contact || '').trim().slice(0, 160);
    const body = String(data.body || '').trim().slice(0, 2000);
    if (!name || body.length < 5) return Response.json({ error: 'Missing fields' }, { status: 400 });
    await ensureTable();
    const duplicate = await database().query(`SELECT 1 FROM contact_messages
      WHERE name = $1 AND body = $2 AND created_at >= NOW() - INTERVAL '5 minutes' LIMIT 1`, [name, body]);
    if (duplicate.rowCount) return Response.json({ error: 'Duplicate message' }, { status: 429 });
    const result = await database().query(`INSERT INTO contact_messages (name, contact, body)
      VALUES ($1, $2, $3) RETURNING id, created_at`, [name, contact, body]);
    return Response.json({ ok: true, ...result.rows[0] }, { status: 201 });
  } catch {
    return Response.json({ error: 'Message could not be saved' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureTable();
    const result = await database().query(`SELECT id, name, contact, body, is_read, created_at
      FROM contact_messages ORDER BY created_at DESC LIMIT 100`);
    return Response.json(result.rows);
  } catch {
    return Response.json({ error: 'Messages could not be loaded' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json();
  const id = Number(data.id);
  if (!Number.isInteger(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });
  await ensureTable();
  await database().query('UPDATE contact_messages SET is_read = $1 WHERE id = $2', [Boolean(data.is_read), id]);
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });
  await ensureTable();
  await database().query('DELETE FROM contact_messages WHERE id = $1', [id]);
  return Response.json({ ok: true });
}
