'use client';

import { FormEvent, useEffect, useState } from 'react';
import QRCode from 'qrcode';

type Bulletin = { id: number; title: string; body: string; created_at: string };
type View = 'closed' | 'bulletins' | 'share' | 'admin';

export default function BulletinCenter() {
  const [view, setView] = useState<View>('closed');
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [qr, setQr] = useState('');
  const [pin, setPin] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  async function loadBulletins() {
    const response = await fetch('/api/bulletins', { cache: 'no-store' });
    if (response.ok) setBulletins(await response.json());
  }
  useEffect(() => { loadBulletins(); }, []);

  async function openShare() {
    setView('share');
    setQr(await QRCode.toDataURL(window.location.origin, { width: 320, margin: 2, color: { dark: '#173f3a', light: '#fffdf8' } }));
  }
  async function nativeShare() {
    if (navigator.share) await navigator.share({ title: 'Iglesia San Agustín', text: 'Conoce nuestra comunidad', url: window.location.origin });
    else { await navigator.clipboard.writeText(window.location.origin); setMessage('Enlace copiado.'); }
  }
  async function publish(event: FormEvent) {
    event.preventDefault(); setMessage('Publicando…');
    const response = await fetch('/api/bulletins', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${pin}` }, body: JSON.stringify({ title, body }) });
    if (!response.ok) { setMessage(response.status === 401 ? 'PIN incorrecto.' : 'No se pudo publicar.'); return; }
    setTitle(''); setBody(''); setMessage('¡Boletín publicado!'); await loadBulletins(); setTimeout(() => setView('bulletins'), 700);
  }
  async function remove(id: number) {
    if (!pin) { setMessage('Escribe el PIN para borrar.'); return; }
    const response = await fetch(`/api/bulletins?id=${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${pin}` } });
    if (response.ok) { setMessage('Boletín borrado.'); await loadBulletins(); } else setMessage('PIN incorrecto.');
  }

  return <>
    <div className="utility-buttons" aria-label="Compartir y boletines">
      <button onClick={openShare} aria-label="Compartir con código QR"><span aria-hidden="true">▦</span> Compartir</button>
      <button onClick={() => setView('bulletins')} aria-label={`Abrir boletines, ${bulletins.length} publicados`}><span aria-hidden="true">●</span> Boletines{bulletins.length > 0 && <b>{bulletins.length}</b>}</button>
    </div>
    {view !== 'closed' && <div className="modal-backdrop" onMouseDown={() => setView('closed')}>
      <section className="bulletin-modal" role="dialog" aria-modal="true" aria-label={view === 'share' ? 'Compartir la aplicación' : 'Boletines'} onMouseDown={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setView('closed')} aria-label="Cerrar">×</button>
        {view === 'share' && <div className="share-panel"><p className="section-kicker">Comparte la fe</p><h2>Escanea y abre la app</h2>{qr && <img className="qr-code" src={qr} alt="Código QR para abrir Iglesia San Agustín" />}<p>Apunta la cámara del teléfono al código.</p><button className="button button-primary" onClick={nativeShare}>Compartir enlace</button></div>}
        {view === 'bulletins' && <div><div className="modal-heading"><div><p className="section-kicker">Nuestra comunidad</p><h2>Boletines</h2></div><button className="admin-link" onClick={() => { setMessage(''); setView('admin'); }}>Administrar</button></div><div className="bulletin-list">{bulletins.length === 0 && <div className="empty-bulletin"><span>♡</span><p>Aún no hay boletines publicados.</p></div>}{bulletins.map(item => <article className="bulletin-card" key={item.id}><time>{new Date(item.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'long', year: 'numeric' })}</time><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></div>}
        {view === 'admin' && <form className="admin-panel" onSubmit={publish}><p className="section-kicker">Panel privado</p><h2>Nuevo boletín</h2><label>PIN privado<input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} required autoComplete="current-password" /></label><label>Título<input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required placeholder="Ej. Misa especial este domingo" /></label><label>Mensaje<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={1000} required rows={5} placeholder="Escribe aquí el anuncio para la comunidad…" /></label><button className="button button-primary" type="submit">Publicar boletín</button>{message && <p className="admin-message" role="status">{message}</p>}{bulletins.length > 0 && <details><summary>Administrar publicados</summary>{bulletins.map(item => <div className="admin-item" key={item.id}><span>{item.title}</span><button type="button" onClick={() => remove(item.id)}>Borrar</button></div>)}</details>}</form>}
      </section>
    </div>}
  </>;
}
