'use client';

import { FormEvent, useState } from 'react';
import { trackAnalytics } from './analytics-client';

export default function ContactForm() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setStatus('Enviando…');
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, contact, body, website: '' }),
      });
      if (!response.ok) throw new Error('Message could not be sent');
      setName('');
      setContact('');
      setBody('');
      setStatus('¡Gracias! Tu mensaje llegó a la iglesia.');
      trackAnalytics('contact_message');
    } catch {
      setStatus('No pudimos enviar el mensaje. Inténtalo nuevamente.');
    } finally {
      setSending(false);
    }
  }

  return <form className="contact-form" onSubmit={submit}>
    <div className="contact-fields">
      <label>Tu nombre<input value={name} onChange={event => setName(event.target.value)} maxLength={80} required autoComplete="name" placeholder="Nombre" /></label>
      <label>Teléfono o correo <span>(opcional)</span><input value={contact} onChange={event => setContact(event.target.value)} maxLength={160} autoComplete="email" placeholder="Para poder responderte" /></label>
    </div>
    <label>¿Cómo podemos ayudarte?<textarea value={body} onChange={event => setBody(event.target.value)} maxLength={2000} minLength={5} required rows={5} placeholder="Escribe tu mensaje o petición de oración…" /></label>
    <div className="contact-submit"><button className="button button-primary" type="submit" disabled={sending}>{sending ? 'Enviando…' : 'Enviar a la iglesia'}</button><p>Tu mensaje será privado y sólo lo verá la administración.</p></div>
    {status && <p className="contact-status" role="status">{status}</p>}
  </form>;
}
