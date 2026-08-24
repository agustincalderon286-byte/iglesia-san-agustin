'use client';

import { useEffect, useState } from 'react';

type LiveSettings = { youtube_url: string; video_id: string; zoom_url: string };

export default function LiveMass() {
  const [settings, setSettings] = useState<LiveSettings>({ youtube_url: '', video_id: '', zoom_url: '' });
  useEffect(() => { fetch('/api/live', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(data => data && setSettings(data)); }, []);

  return <section className="live-section" id="misa-en-vivo">
    <div className="live-heading">
      <div><p className="section-kicker light"><span className="live-dot" /> Transmisión desde San Agustín</p><h2>Misa en vivo</h2></div>
      <p>Participa desde casa y comparte este momento de fe con nuestra comunidad.</p>
    </div>
    <div className="live-player">
      {settings.video_id ? <iframe src={`https://www.youtube.com/embed/${settings.video_id}?rel=0&playsinline=1`} title="Misa en vivo de la Iglesia San Agustín" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <div className="live-placeholder"><span aria-hidden="true">✝</span><h3>Próxima transmisión</h3><p>La misa aparecerá aquí cuando la iglesia publique el enlace en vivo.</p><small>Domingos · 9:00 AM y 12:00 PM</small></div>}
    </div>
    {settings.zoom_url && <div className="zoom-access"><div><span aria-hidden="true">⌁</span><p><strong>Participa por Zoom</strong><small>Únete a la misa o reunión desde tu teléfono o computadora.</small></p></div><a className="button zoom-button" href={settings.zoom_url} target="_blank" rel="noopener noreferrer">Unirse por Zoom <span>→</span></a></div>}
  </section>;
}
