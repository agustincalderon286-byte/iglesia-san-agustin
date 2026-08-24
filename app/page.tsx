const services = [
  { day: 'Domingo', time: '9:00 AM y 12:00 PM', label: 'Santa Misa' },
  { day: 'Miércoles', time: '7:00 PM', label: 'Oración comunitaria' },
  { day: 'Viernes', time: '6:00 PM', label: 'Adoración y confesión' },
];

export default function Home() {
  return (
    <main>
      <nav className="nav" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Iglesia San Agustín, inicio">
          <span className="brand-mark" aria-hidden="true">✝</span>
          <span><strong>San Agustín</strong><small>Comunidad de fe</small></span>
        </a>
        <div className="nav-links">
          <a href="#nosotros">Nosotros</a><a href="#horarios">Horarios</a><a href="#contacto">Contacto</a>
        </div>
        <a className="nav-cta" href="#horarios">Visítanos</a>
      </nav>

      <section className="hero" id="inicio">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> Una iglesia para todos</p>
          <h1>Un lugar para creer, <em>crecer</em> y pertenecer.</h1>
          <p className="lead">En la Iglesia San Agustín caminamos juntos en la fe, servimos con amor y abrimos nuestras puertas a cada persona que busca esperanza.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#horarios">Ver horarios <span>→</span></a>
            <a className="button button-quiet" href="#nosotros">Conoce nuestra comunidad</a>
          </div>
        </div>
        <div className="hero-art" aria-label="Ilustración decorativa de la iglesia">
          <div className="sun" /><div className="church-cross">+</div><div className="church-tower" />
          <div className="church-body"><div className="door" /></div>
          <div className="hill hill-back" /><div className="hill hill-front" />
          <div className="verse-card"><span>“</span><p>Nuestro corazón está inquieto hasta que descanse en Ti.</p><small>San Agustín</small></div>
        </div>
      </section>

      <section className="welcome" id="nosotros">
        <div><p className="section-kicker">Bienvenido a casa</p><h2>La fe se vive mejor en comunidad.</h2></div>
        <div><p>Somos una familia que celebra, aprende y sirve junta. No importa de dónde vienes o en qué momento de tu camino te encuentres: aquí hay un lugar para ti.</p><a className="text-link" href="#contacto">Quiero saber más <span>→</span></a></div>
      </section>

      <section className="schedule-section" id="horarios">
        <div className="schedule-intro"><p className="section-kicker light">Encuéntranos esta semana</p><h2>Ven tal como eres.</h2><p>Siempre será un buen momento para encontrarnos, orar y compartir.</p></div>
        <div className="schedule-list">
          {services.map((service) => <article className="service" key={service.day}><div className="service-day">{service.day.slice(0, 3)}</div><div><h3>{service.day}</h3><p>{service.label}</p></div><time>{service.time}</time></article>)}
        </div>
      </section>

      <section className="contact" id="contacto">
        <p className="section-kicker">Estamos cerca</p><h2>Nos encantaría conocerte.</h2>
        <p>Escríbenos para recibir información, pedir oración o planear tu primera visita.</p>
        <div className="contact-actions"><a className="button button-primary" href="mailto:hola@iglesiasanagustin.org">Enviar un mensaje</a><a className="button button-outline" href="#horarios">Planear mi visita</a></div>
      </section>

      <footer><a className="brand footer-brand" href="#inicio"><span className="brand-mark" aria-hidden="true">✝</span><span><strong>San Agustín</strong><small>Comunidad de fe</small></span></a><p>© 2026 Iglesia San Agustín. Hecho con fe y esperanza.</p><a href="#inicio">Volver arriba ↑</a></footer>
    </main>
  );
}
