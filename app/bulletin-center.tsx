'use client';

import { FormEvent, useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Bulletin = { id: number; title: string; body: string; created_at: string };
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

  return <>
    <div className="utility-buttons" aria-label="Compartir y boletines">
      <button onClick={openShare} aria-label="Compartir con código QR"><span aria-hidden="true">▦</span> Compartir</button>
      <button onClick={() => setView('bulletins')} aria-label={`Abrir boletines, ${bulletins.length} publicados`}><span aria-hidden="true">●</span> Boletines{bulletins.length > 0 && <b>{bulletins.length}</b>}</button>
    </div>
    {view !== 'closed' && <div className="modal-backdrop" onMouseDown={() => setView('closed')}>
      <section className="bulletin-modal" role="dialog" aria-modal="true" aria-label={view === 'share' ? 'Compartir la aplicación' : 'Boletines'} onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setView('closed')} aria-label="Cerrar">×</button>
        {view === 'share' && <div className="share-panel"><p className="section-kicker">Comparte la fe</p><h2>Invita a alguien</h2>{qr && <img className="qr-code" src={qr} alt="Código QR para abrir Iglesia San Agustín" />}<p>Escanea el código o comparte la página directamente.</p>{shareUrl && <div className="share-options" aria-label="Opciones para compartir"><a className="share-option share-sms" href={`sms:?body=${encodeURIComponent(`Te invito a conocer la Iglesia San Agustín: ${shareUrl}`)}`}><span aria-hidden="true">✉</span><strong>Mensaje</strong></a><a className="share-option share-whatsapp" href={`https://wa.me/?text=${encodeURIComponent(`Te invito a conocer la Iglesia San Agustín: ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">W</span><strong>WhatsApp</strong></a><a className="share-option share-facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">f</span><strong>Facebook</strong></a></div>}<button className="button button-outline share-more" onClick={nativeShare}>Más opciones para compartir</button></div>}
        {view === 'bulletins' && <div><div className="modal-heading"><div><p className="section-kicker">Nuestra comunidad</p><h2>Boletines</h2></div><button className="admin-link" onClick={() => { setMessage(''); setView('admin'); }}>Administrar</button></div><div className="bulletin-list">{bulletins.length === 0 && <div className="empty-bulletin"><span>♡</span><p>Aún no hay boletines publicados.</p></div>}{bulletins.map(item => <article className="bulletin-card" key={item.id}><time>{new Date(item.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' })}</time><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></div>}
        {view === 'admin' && <form className="admin-panel" onSubmit={publish}><p className="section-kicker">Panel privado</p><h2>Administrar</h2><label>PIN privado<input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} required autoComplete="current-password" /></label><div className="live-admin"><h3>Misa en vivo</h3><label>Enlace de YouTube<input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/live/..." /></label><label>Enlace de Zoom<input type="url" value={zoomUrl} onChange={e => setZoomUrl(e.target.value)} placeholder="https://zoom.us/j/..." /></label><button className="button button-outline" type="button" onClick={saveLive}>Actualizar transmisión y Zoom</button></div><div className="bulletin-admin"><h3>Nuevo boletín</h3><label>Título<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required placeholder="Ej. Misa especial este domingo" /></label><label>Mensaje<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={1000} required rows={5} placeholder="Escribe aquí el anuncio para la comunidad…" /></label><button className="button button-primary" type="submit">Publicar boletín</button></div>{message && <p className="admin-message" role="status">{message}</p>}{bulletins.length > 0 && <details><summary>Administrar publicados</summary>{bulletins.map(item => <div className="admin-item" key={item.id}><span>{item.title}</span><button type="button" onClick={() => remove(item.id)}>Borrar</button></div>)}</details>}</form>}
      </section>
    </div>}
  </>;
}
