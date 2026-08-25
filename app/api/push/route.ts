import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

let pool: Pool | undefined;

function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 3,
  });
  return pool;
}

async function ensureTable() {
  await database().query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return Response.json({ error: 'Notifications are not configured' }, { status: 503 });
  return Response.json({ publicKey });
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const endpoint = String(data.endpoint || '').trim();
    const p256dh = String(data.keys?.p256dh || '').trim();
    const auth = String(data.keys?.auth || '').trim();
    if (!endpoint.startsWith('https://') || !p256dh || !auth) {
      return Response.json({ error: 'Invalid subscription' }, { status: 400 });
    }
    await ensureTable();
    await database().query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
       VALUES ($1, $2, $3)
       ON CONFLICT (endpoint) DO UPDATE
       SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, updated_at = NOW()`,
      [endpoint.slice(0, 2000), p256dh.slice(0, 500), auth.slice(0, 500)],
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Subscription could not be saved' }, { status: 500 });
  }
}
