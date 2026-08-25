'use client';

import { FormEvent, useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Bulletin = { id: number; title: string; body: string; created_at: string };
type ContactMessage = { id: number; name: string; contact: string; body: string; is_read: boolean; created_at: string };
type Stats = { period_days: number; subscribers: number; bulletins: number; messages: number; unread_messages: number; unique_visitors: number; totals: Record<string, number>; daily: Array<{ day: string; visits: number; visitors: number }> };
type View = 'closed' | 'bulletins' | 'share' | 'admin';

export default function BulletinCenter() {
  const [view, setView] = useState<View>('closed');
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [qr, setQr] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [pin, setPin] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [zoomUrl, setZoomUrl] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [inbox, setInbox] = useState<ContactMessage[] | null>(null);
  const [inboxLoading, setInboxLoading] = useState(false);

  async function loadBulletins() {
    const response = await fetch('/api/bulletins', { cache: 'no-store' });
    if (response.ok) setBulletins(await response.json());
  }
  useEffect(() => { loadBulletins(); fetch('/api/live', { cache: 'no-store' }).then(r => r.json()).then(data => { setYoutubeUrl(data.youtube_url || ''); setZoomUrl(data.zoom_url || ''); }); }, []);

  async function openShare() {
    setView('share');
    const url = window.location.origin;
    setShareUrl(url);
    setQr(await QRCode.toDataURL(url, { width: 320, margin: 2, color: { dark: '#173f3a', light: '#fffdf8' } }));
  }
  async function nativeShare() {
    if (navigator.share) await navigator.share({ title: 'Iglesia San Agustín', text: 'Conoce nuestra comunidad', url: window.location.origin });
    else { await navigator.clipboard.writeText(window.location.origin); setMessage('Enlace copiado.'); }
  }
  async function publish(event: FormEvent) {
    event.preventDefault(); setMessage('Publicando…');
    const response = await fetch('/api/bulletins', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${pin}` }, body: JSON.stringify({ title, body }) });
    if (!response.ok) { setMessage(response.status === 401 ? 'PIN incorrecto.' : 'No se pudo publicar.'); return; }
    const published = await response.json();
    const sent = Number(published.notifications?.sent || 0);
    const subscribed = Number(published.notifications?.subscribed || 0);
    setTitle(''); setBody('');
    setMessage(subscribed > 0 ? `¡Boletín publicado y enviado a ${sent} teléfono${sent === 1 ? '' : 's'}!` : '¡Boletín publicado! Todavía no hay teléfonos suscritos.');
    await loadBulletins(); setTimeout(() => setView('bulletins'), 1800);
  }
  async function remove(id: number) {
    if (!pin) { setMessage('Escribe el PIN para borrar.'); return; }
    const response = await fetch(`/api/bulletins?id=${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${pin}` } });
    if (response.ok) { setMessage('Boletín borrado.'); await loadBulletins(); } else setMessage('PIN incorrecto.');
  }
  async function saveLive() {
    setMessage('Guardando transmisión…');
    const response = await fetch('/api/live', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${pin}` }, body: JSON.stringify({ youtube_url: youtubeUrl, zoom_url: zoomUrl }) });
    if (response.ok) setMessage('¡Transmisión actualizada! Recarga la página para verla.');
    else setMessage(response.status === 401 ? 'PIN incorrecto.' : 'Revisa que los enlaces de YouTube y Zoom sean válidos.');
  }
  async function loadStats() {
    if (!pin) { setMessage('Escribe el PIN para ver las estadísticas.'); return; }
    setStatsLoading(true); setMessage('');
    const response = await fetch('/api/analytics', { cache: 'no-store', headers: { authorization: `Bearer ${pin}` } });
    setStatsLoading(false);
    if (response.ok) setStats(await response.json());
    else setMessage(response.status === 401 ? 'PIN incorrecto.' : 'No se pudieron cargar las estadísticas.');
  }
  async function loadMessages() {
    if (!pin) { setMessage('Escribe el PIN para abrir el buzón.'); return; }
    setInboxLoading(true); setMessage('');
    const response = await fetch('/api/messages', { cache: 'no-store', headers: { authorization: `Bearer ${pin}` } });
    setInboxLoading(false);
    if (response.ok) setInbox(await response.json());
    else setMessage(response.status === 401 ? 'PIN incorrecto.' : 'No se pudo abrir el buzón.');
  }
  async function setMessageRead(item: ContactMessage, isRead: boolean) {
    const response = await fetch('/api/messages', { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${pin}` }, body: JSON.stringify({ id: item.id, is_read: isRead }) });
    if (response.ok) setInbox(current => current?.map(messageItem => messageItem.id === item.id ? { ...messageItem, is_read: isRead } : messageItem) || null);
    else setMessage('No se pudo actualizar el mensaje.');
  }
  async function removeMessage(item: ContactMessage) {
    if (!window.confirm(`¿Borrar el mensaje de ${item.name}?`)) return;
    const response = await fetch(`/api/messages?id=${item.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${pin}` } });
    if (response.ok) setInbox(current => current?.filter(messageItem => messageItem.id !== item.id) || null);
    else setMessage('No se pudo borrar el mensaje.');
  }
  function replyHref(contact: string) {
    return contact.includes('@') ? `mailto:${contact}` : `tel:${contact.replace(/[^+\d]/g, '')}`;
  }

  return <>
    <div className="utility-buttons" aria-label="Compartir y boletines">
      <button onClick={openShare} aria-label="Compartir con código QR" data-track="share_open"><span aria-hidden="true">▦</span> Compartir</button>
      <button onClick={() => setView('bulletins')} aria-label={`Abrir boletines, ${bulletins.length} publicados`} data-track="bulletins_open"><span aria-hidden="true">●</span> Boletines{bulletins.length > 0 && <b>{bulletins.length}</b>}</button>
    </div>
    {view !== 'closed' && <div className="modal-backdrop" onMouseDown={() => setView('closed')}>
      <section className="bulletin-modal" role="dialog" aria-modal="true" aria-label={view === 'share' ? 'Compartir la aplicación' : 'Boletines'} onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setView('closed')} aria-label="Cerrar">×</button>
        {view === 'share' && <div className="share-panel"><p className="section-kicker">Comparte la fe</p><h2>Invita a alguien</h2>{qr && <img className="qr-code" src={qr} alt="Código QR para abrir Iglesia San Agustín" />}<p>Escanea el código o comparte la página directamente.</p>{shareUrl && <div className="share-options" aria-label="Opciones para compartir"><a className="share-option share-sms" href={`sms:?body=${encodeURIComponent(`Te invito a conocer la Iglesia San Agustín: ${shareUrl}`)}`} data-track="share_sms"><span aria-hidden="true">✉</span><strong>Mensaje</strong></a><a className="share-option share-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(`Te invito a conocer la Iglesia San Agustín: ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" data-track="share_whatsapp"><span aria-hidden="true">W</span><strong>WhatsApp</strong></a><a className="share-option share-facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" data-track="share_facebook"><span aria-hidden="true">f</span><strong>Facebook</strong></a></div>}<button className="button button-outline share-more" onClick={nativeShare} data-track="share_native">Más opciones para compartir</button></div>}
        {view === 'bulletins' && <div><div className="modal-heading"><div><p className="section-kicker">Nuestra comunidad</p><h2>Boletines</h2></div><button className="admin-link" onClick={() => { setMessage(''); setView('admin'); }}>Administrar</button></div><div className="bulletin-list">{bulletins.length === 0 && <div className="empty-bulletin"><span>♡</span><p>Aún no hay boletines publicados.</p></div>}{bulletins.map(item => <article className="bulletin-card" key={item.id}><time>{new Date(item.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' })}</time><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></div>}
        {view === 'admin' && <form className="admin-panel" onSubmit={publish}>
          <p className="section-kicker">Panel privado</p><h2>Administrar</h2>
          <label>PIN privado<input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} required autoComplete="current-password" /></label>
          <div className="stats-admin">
            <div className="stats-title"><div><p>Actividad anónima</p><h3>Estadísticas</h3></div><button className="button button-outline" type="button" onClick={loadStats}>{statsLoading ? 'Cargando…' : stats ? 'Actualizar' : 'Ver estadísticas'}</button></div>
            {stats && <><div className="stats-grid">
              <article><strong>{stats.subscribers}</strong><span>teléfonos registrados</span></article>
              <article><strong>{stats.unique_visitors}</strong><span>personas en 30 días</span></article>
              <article><strong>{stats.totals.page_view || 0}</strong><span>visitas en 30 días</span></article>
              <article><strong>{stats.totals.notification_open || 0}</strong><span>notificaciones abiertas</span></article>
              <article><strong>{stats.totals.zoom_click || 0}</strong><span>entradas a Zoom</span></article>
              <article><strong>{(stats.totals.cashapp_click || 0) + (stats.totals.zelle_click || 0)}</strong><span>interés en donaciones</span></article>
              <article><strong>{(stats.totals.share_sms || 0) + (stats.totals.share_whatsapp || 0) + (stats.totals.share_facebook || 0) + (stats.totals.share_native || 0) + (stats.totals.bible_share || 0)}</strong><span>veces compartida</span></article>
              <article><strong>{stats.totals.bible_chapter || 0}</strong><span>capítulos leídos</span></article>
              <article><strong>{stats.messages}</strong><span>mensajes en 30 días</span></article>
            </div><p className="stats-note">Últimos 30 días · No se guardan nombres, teléfonos ni ubicación.</p></>}
          </div>
          <div className="inbox-admin">
            <div className="inbox-title"><div><p>Mensajes privados</p><h3>Buzón {inbox && <span>{inbox.filter(item => !item.is_read).length} nuevos</span>}</h3></div><button className="button button-outline" type="button" onClick={loadMessages}>{inboxLoading ? 'Abriendo…' : inbox ? 'Actualizar' : 'Abrir buzón'}</button></div>
            {inbox && <div className="inbox-list">
              {inbox.length === 0 && <p className="inbox-empty">Todavía no hay mensajes.</p>}
              {inbox.map(item => <article className={`inbox-card${item.is_read ? ' is-read' : ''}`} key={item.id}>
                <header><div><strong>{item.name}</strong><time>{new Date(item.created_at).toLocaleString('es-US', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>{!item.is_read && <span>Nuevo</span>}</header>
                <p>{item.body}</p>
                {item.contact && <a className="inbox-contact" href={replyHref(item.contact)}>Responder: {item.contact}</a>}
                <div className="inbox-actions"><button type="button" onClick={() => setMessageRead(item, !item.is_read)}>{item.is_read ? 'Marcar no leído' : 'Marcar leído'}</button><button className="delete-message" type="button" onClick={() => removeMessage(item)}>Borrar</button></div>
              </article>)}
            </div>}
          </div>
          <div className="live-admin"><h3>Misa en vivo</h3><label>Enlace de YouTube<input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/live/..." /></label><label>Enlace de Zoom<input type="url" value={zoomUrl} onChange={e => setZoomUrl(e.target.value)} placeholder="https://zoom.us/j/..." /></label><button className="button button-outline" type="button" onClick={saveLive}>Actualizar transmisión y Zoom</button></div>
          <div className="bulletin-admin"><h3>Nuevo boletín</h3><label>Título<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required placeholder="Ej. Misa especial este domingo" /></label><label>Mensaje<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={1000} required rows={5} placeholder="Escribe aquí el anuncio para la comunidad…" /></label><button className="button button-primary" type="submit">Publicar boletín</button></div>
          {message && <p className="admin-message" role="status">{message}</p>}
          {bulletins.length > 0 && <details><summary>Administrar publicados</summary>{bulletins.map(item => <div className="admin-item" key={item.id}><span>{item.title}</span><button type="button" onClick={() => remove(item.id)}>Borrar</button></div>)}</details>}
        </form>}
      </section>
    </div>}
  </>;
}
