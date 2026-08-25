import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set([
  'page_view', 'app_install', 'notifications_enabled', 'notification_open',
  'zoom_click', 'cashapp_click', 'zelle_click', 'bulletins_open', 'bible_open',
  'share_open', 'share_sms', 'share_whatsapp', 'share_facebook', 'share_native',
  'bible_chapter', 'bible_share', 'bible_favorite', 'manual_refresh', 'contact_message',
]);

let pool: Pool | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, max: 3 });
  return pool;
}

async function ensureTables() {
  await database().query(`CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event VARCHAR(50) NOT NULL,
    visitor_id VARCHAR(64),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await database().query('CREATE INDEX IF NOT EXISTS analytics_events_created_idx ON analytics_events (created_at DESC)');
  await database().query('CREATE INDEX IF NOT EXISTS analytics_events_event_idx ON analytics_events (event, created_at DESC)');
  await database().query(`CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint TEXT PRIMARY KEY, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await database().query('CREATE TABLE IF NOT EXISTS bulletins (id SERIAL PRIMARY KEY, title VARCHAR(100) NOT NULL, body VARCHAR(1000) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  await database().query(`CREATE TABLE IF NOT EXISTS contact_messages (
    id BIGSERIAL PRIMARY KEY, name VARCHAR(80) NOT NULL, contact VARCHAR(160) NOT NULL DEFAULT '',
    body VARCHAR(2000) NOT NULL, is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
}

function authorized(request: Request) {
  return Boolean(process.env.ADMIN_PIN && request.headers.get('authorization') === `Bearer ${process.env.ADMIN_PIN}`);
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid origin' }, { status: 403 });
    const data = await request.json();
    const event = String(data.event || '').trim();
    if (!ALLOWED_EVENTS.has(event)) return Response.json({ error: 'Invalid event' }, { status: 400 });
    const rawVisitor = String(data.visitor_id || '');
    const visitor = /^[a-zA-Z0-9-]{1,64}$/.test(rawVisitor) ? rawVisitor : null;
    const rawMetadata = data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
    const metadata = Object.fromEntries(Object.entries(rawMetadata).slice(0, 6).map(([key, value]) => [key.slice(0, 40), String(value).slice(0, 100)]));
    await ensureTables();
    await database().query('INSERT INTO analytics_events (event, visitor_id, metadata) VALUES ($1, $2, $3)', [event, visitor, JSON.stringify(metadata)]);
    return Response.json({ ok: true }, { status: 201 });
  } catch {
    return Response.json({ error: 'Event could not be saved' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureTables();
    const [events, visitors, subscribers, bulletins, messages, daily] = await Promise.all([
      database().query(`SELECT event, COUNT(*)::int AS total
        FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY event ORDER BY total DESC`),
      database().query(`SELECT COUNT(DISTINCT visitor_id)::int AS total
        FROM analytics_events WHERE event = 'page_view' AND created_at >= NOW() - INTERVAL '30 days'`),
      database().query('SELECT COUNT(*)::int AS total FROM push_subscriptions'),
      database().query('SELECT COUNT(*)::int AS total FROM bulletins'),
      database().query(`SELECT
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS total,
        COUNT(*) FILTER (WHERE NOT is_read)::int AS unread FROM contact_messages`),
      database().query(`SELECT TO_CHAR(created_at AT TIME ZONE 'America/Chicago', 'YYYY-MM-DD') AS day,
        COUNT(*) FILTER (WHERE event = 'page_view')::int AS visits,
        COUNT(DISTINCT visitor_id) FILTER (WHERE event = 'page_view')::int AS visitors
        FROM analytics_events WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day`),
    ]);
    return Response.json({
      period_days: 30,
      totals: Object.fromEntries(events.rows.map(row => [row.event, Number(row.total)])),
      unique_visitors: Number(visitors.rows[0]?.total || 0),
      subscribers: Number(subscribers.rows[0]?.total || 0),
      bulletins: Number(bulletins.rows[0]?.total || 0),
      messages: Number(messages.rows[0]?.total || 0),
      unread_messages: Number(messages.rows[0]?.unread || 0),
      daily: daily.rows,
    });
  } catch {
    return Response.json({ error: 'Statistics could not be loaded' }, { status: 500 });
  }
}
