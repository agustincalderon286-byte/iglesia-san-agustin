import { Pool } from 'pg';

export const dynamic = 'force-dynamic';
let pool: Pool | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, max: 3 });
  return pool;
}
async function ensureTable() {
  await database().query("CREATE TABLE IF NOT EXISTS live_settings (id INTEGER PRIMARY KEY CHECK (id = 1), youtube_url TEXT NOT NULL DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await database().query("ALTER TABLE live_settings ADD COLUMN IF NOT EXISTS zoom_url TEXT NOT NULL DEFAULT ''");
  await database().query("INSERT INTO live_settings (id, youtube_url) VALUES (1, '') ON CONFLICT (id) DO NOTHING");
}
function videoId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/))([\w-]{11})/i);
  return match?.[1] || '';
}
function authorized(request: Request) {
  return Boolean(process.env.ADMIN_PIN && request.headers.get('authorization') === `Bearer ${process.env.ADMIN_PIN}`);
}
function validZoomUrl(url: string) {
  if (!url) return true;
  try { const parsed = new URL(url); return parsed.protocol === 'https:' && (parsed.hostname === 'zoom.us' || parsed.hostname.endsWith('.zoom.us') || parsed.hostname === 'zoom.com' || parsed.hostname.endsWith('.zoom.com')); }
  catch { return false; }
}
export async function GET() {
  try { await ensureTable(); const result = await database().query('SELECT youtube_url, zoom_url FROM live_settings WHERE id = 1'); const url = result.rows[0]?.youtube_url || ''; return Response.json({ youtube_url: url, video_id: videoId(url), zoom_url: result.rows[0]?.zoom_url || '' }); }
  catch { return Response.json({ youtube_url: '', video_id: '', zoom_url: '' }); }
}
export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const url = String(body.youtube_url || '').trim().slice(0, 500);
  const zoomUrl = String(body.zoom_url || '').trim().slice(0, 500);
  if (url && !videoId(url)) return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  if (!validZoomUrl(zoomUrl)) return Response.json({ error: 'Invalid Zoom URL' }, { status: 400 });
  await ensureTable(); await database().query('UPDATE live_settings SET youtube_url = $1, zoom_url = $2, updated_at = NOW() WHERE id = 1', [url, zoomUrl]);
  return Response.json({ youtube_url: url, video_id: videoId(url), zoom_url: zoomUrl });
}
