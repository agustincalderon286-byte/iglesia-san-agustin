import { Pool } from 'pg';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';
let pool: Pool | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, max: 3 });
  return pool;
}
async function ensureTable() {
  await database().query('CREATE TABLE IF NOT EXISTS bulletins (id SERIAL PRIMARY KEY, title VARCHAR(100) NOT NULL, body VARCHAR(1000) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
}
async function sendBulletinNotifications(title: string, body: string) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { sent: 0, subscribed: 0 };

  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@iglesia-san-agustin.onrender.com', publicKey, privateKey);
  await database().query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const result = await database().query('SELECT endpoint, p256dh, auth FROM push_subscriptions');
  const payload = JSON.stringify({ title, body: body.slice(0, 240), url: '/' });
  let sent = 0;

  await Promise.all(result.rows.map(async subscription => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload, { TTL: 86400 });
      sent += 1;
    } catch (error) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await database().query('DELETE FROM push_subscriptions WHERE endpoint = $1', [subscription.endpoint]);
      }
    }
  }));

  return { sent, subscribed: result.rowCount || 0 };
}
function authorized(request: Request) {
  const configured = process.env.ADMIN_PIN;
  return Boolean(configured && request.headers.get('authorization') === `Bearer ${configured}`);
}
export async function GET() {
  try { await ensureTable(); const result = await database().query('SELECT id, title, body, created_at FROM bulletins ORDER BY created_at DESC LIMIT 50'); return Response.json(result.rows); }
  catch { return Response.json([]); }
}
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await request.json(); const title = String(data.title || '').trim().slice(0, 100); const body = String(data.body || '').trim().slice(0, 1000);
  if (!title || !body) return Response.json({ error: 'Missing fields' }, { status: 400 });
  await ensureTable(); const result = await database().query('INSERT INTO bulletins (title, body) VALUES ($1, $2) RETURNING id, title, body, created_at', [title, body]);
  const notifications = await sendBulletinNotifications(title, body);
  return Response.json({ ...result.rows[0], notifications }, { status: 201 });
}
export async function DELETE(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get('id')); if (!Number.isInteger(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });
  await ensureTable(); await database().query('DELETE FROM bulletins WHERE id = $1', [id]); return Response.json({ ok: true });
}
