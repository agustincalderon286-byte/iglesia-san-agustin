'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { trackAnalytics } from './analytics-client';

type PrayerRequest = { id: number; display_name: string; category: string; title: string; body: string; prayer_state: string; created_at: string };
type PrayerReply = { id: number; request_id: number; display_name: string; body: string; created_at: string };
type Composer = { kind: 'request' } | { kind: 'reply'; request: PrayerRequest };

const CATEGORIES = [
  ['todas', 'Todas'], ['salud', 'Salud'], ['familia', 'Familia'], ['trabajo', 'Trabajo'],
  ['fortaleza', 'Fortaleza'], ['agradecimiento', 'Agradecimiento'], ['otra', 'Otra'],
] as const;

const STATE_LABELS: Record<string, string> = { new: 'Petición', praying: 'Estamos orando', answered: 'Atendida' };

export default function PrayerWall() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [replies, setReplies] = useState<PrayerReply[]>([]);
  const [filter, setFilter] = useState('todas');
  const [composer, setComposer] = useState<Composer | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('fortaleza');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');

  async function loadPrayers() {
    const response = await fetch('/api/prayers', { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      setRequests(data.requests || []);
      setReplies(data.replies || []);
    }
  }

  useEffect(() => { loadPrayers(); }, []);

  const visibleRequests = useMemo(() => filter === 'todas' ? requests : requests.filter(item => item.category === filter), [filter, requests]);

  function openComposer(next: Composer) {
    setComposer(next); setDisplayName(''); setCategory('fortaleza'); setTitle(''); setBody(''); setConsent(false); setStatus('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!composer || sending) return;
    setSending(true); setStatus('Enviando para aprobación…');
    const payload = composer.kind === 'request'
      ? { kind: 'request', display_name: displayName, category, title, body, consent, website: '' }
      : { kind: 'reply', request_id: composer.request.id, display_name: displayName, body, website: '' };
    try {
      const response = await fetch('/api/prayers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('Could not submit');
      setStatus(composer.kind === 'request' ? '¡Petición recibida! Aparecerá cuando la administración la apruebe.' : '¡Respuesta recibida! Aparecerá cuando la administración la apruebe.');
      setTitle(''); setBody(''); setConsent(false);
      trackAnalytics(composer.kind === 'request' ? 'prayer_request' : 'prayer_reply');
    } catch {
      setStatus('No pudimos guardar el mensaje. Inténtalo nuevamente.');
    } finally {
      setSending(false);
    }
  }

  return <section className="prayer-section" id="oracion">
    <div className="prayer-heading">
      <div><p className="section-kicker light">Oremos unos por otros</p><h2>Muro de oración</h2><p>Comparte una necesidad, acompaña a alguien con tus palabras y construyamos juntos una comunidad de esperanza.</p></div>
      <button className="button prayer-main-button" onClick={() => openComposer({ kind: 'request' })}>Enviar una petición <span>＋</span></button>
    </div>
    <p className="moderation-note"><span aria-hidden="true">✓</span> Todas las peticiones y respuestas son revisadas por la administración antes de publicarse.</p>
    <div className="prayer-filters" aria-label="Filtrar peticiones">
      {CATEGORIES.map(([value, label]) => <button className={filter === value ? 'is-active' : ''} key={value} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    <div className="prayer-grid">
      {visibleRequests.length === 0 && <div className="prayer-empty"><span>♡</span><h3>Este espacio está listo para escuchar.</h3><p>Sé la primera persona en compartir una petición con nuestra comunidad.</p></div>}
      {visibleRequests.map(item => {
        const itemReplies = replies.filter(reply => reply.request_id === item.id);
        return <article className="prayer-card" key={item.id}>
          <header><span>{CATEGORIES.find(([value]) => value === item.category)?.[1] || 'Oración'}</span><time>{new Date(item.created_at).toLocaleDateString('es-US', { day: 'numeric', month: 'short' })}</time></header>
          <h3>{item.title}</h3><p className="prayer-body">{item.body}</p>
          <div className="prayer-meta"><strong>— {item.display_name}</strong><span className={`prayer-state state-${item.prayer_state}`}>{STATE_LABELS[item.prayer_state] || 'Petición'}</span></div>
          {itemReplies.length > 0 && <div className="prayer-replies"><h4>{itemReplies.length} {itemReplies.length === 1 ? 'respuesta' : 'respuestas'} de la comunidad</h4>{itemReplies.map(reply => <blockquote key={reply.id}><p>{reply.body}</p><footer>— {reply.display_name}</footer></blockquote>)}</div>}
          <button className="prayer-reply-button" onClick={() => openComposer({ kind: 'reply', request: item })}>Responder con apoyo <span>→</span></button>
        </article>;
      })}
    </div>
    {composer && <div className="prayer-modal-backdrop" onMouseDown={() => setComposer(null)}>
      <form className="prayer-modal" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={() => setComposer(null)} aria-label="Cerrar">×</button>
        <p className="section-kicker">{composer.kind === 'request' ? 'Comparte tu intención' : 'Acompaña con amor'}</p>
        <h3>{composer.kind === 'request' ? 'Petición de oración' : `Responder a “${composer.request.title}”`}</h3>
        <label>Tu nombre <span>(opcional)</span><input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} placeholder="Se mostrará como Anónimo si lo dejas vacío" /></label>
        {composer.kind === 'request' && <><div className="prayer-form-row"><label>Categoría<select value={category} onChange={event => setCategory(event.target.value)}>{CATEGORIES.slice(1).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Título<input value={title} onChange={event => setTitle(event.target.value)} minLength={3} maxLength={120} required placeholder="¿Por qué podemos orar?" /></label></div></>}
        <label>{composer.kind === 'request' ? 'Tu petición' : 'Tu respuesta'}<textarea value={body} onChange={event => setBody(event.target.value)} minLength={5} maxLength={composer.kind === 'request' ? 1600 : 1000} rows={5} required placeholder={composer.kind === 'request' ? 'Comparte solamente lo que deseas hacer público…' : 'Escribe un mensaje respetuoso de apoyo u oración…'} /></label>
        <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        {composer.kind === 'request' && <label className="prayer-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required /><span>Autorizo que esta petición aparezca públicamente si la administración la aprueba.</span></label>}
        <p className="prayer-privacy">No incluyas teléfonos, direcciones ni información médica privada. Puedes usar “Anónimo”.</p>
        <button className="button button-primary" type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar para aprobación'}</button>
        {status && <p className="prayer-status" role="status">{status}</p>}
      </form>
    </div>}
  </section>;
}
