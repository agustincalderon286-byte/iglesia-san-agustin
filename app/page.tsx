import PwaControls from './pwa-controls';
import BulletinCenter from './bulletin-center';
import LiveMass from './live-mass';
import AnalyticsTracker from './analytics-tracker';
import RefreshButton from './refresh-button';
import ContactForm from './contact-form';
import PrayerWall from './prayer-wall';

const services = [
  { day: 'Domingo', time: '9:00 AM y 12:00 PM', label: 'Santa Misa' },
  { day: 'Miércoles', time: '7:00 PM', label: 'Oración comunitaria' },
  { day: 'Viernes', time: '6:00 PM', label: 'Adoración y confesión' },
];

export default function Home() {
  return (
    <main>
      <AnalyticsTracker />
      <nav className="nav" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="Iglesia San Agustín, inicio">
          <span className="brand-mark" aria-hidden="true">✝</span>
          <span><strong>San Agustín</strong><small>Comunidad de fe</small></span>
        </a>
        <div className="nav-links">
          <a href="/biblia" data-track="bible_open">Biblia</a><a href="#oracion">Oración</a><a href="#misa-en-vivo">En vivo</a><a href="#horarios">Horarios</a><a href="#donaciones">Donar</a><a href="#contacto">Contacto</a>
        </div>
        <div className="nav-actions"><RefreshButton /><a className="nav-cta" href="#horarios">Visítanos</a></div>
      </nav>

      <BulletinCenter />

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

      <section className="bible-preview" id="biblia">
        <div className="bible-preview-copy">
          <p className="section-kicker">Palabra para cada día</p>
          <h2>La Biblia, en su propio espacio.</h2>
          <p>Abre una lectura cómoda y enfocada, elige cualquier libro y capítulo, guarda tus versículos favoritos y compártelos con la comunidad.</p>
          <a className="button button-primary" href="/biblia" data-track="bible_open">Abrir la Biblia <span>→</span></a>
        </div>
        <aside className="bible-preview-card" aria-label="Acceso a la lectura del día">
          <span>Lectura recomendada</span>
          <strong>Juan 3:16</strong>
          <p>Una lectura para recordar el amor y la esperanza que nos reúne.</p>
          <a href="/biblia?libro=43&amp;capitulo=3&amp;versiculo=16">Leer el versículo <span>→</span></a>
        </aside>
      </section>

      <PrayerWall />

      <LiveMass />

      <section className="schedule-section" id="horarios">
        <div className="schedule-intro"><p className="section-kicker light">Encuéntranos esta semana</p><h2>Ven tal como eres.</h2><p>Siempre será un buen momento para encontrarnos, orar y compartir.</p></div>
        <div className="schedule-list">
          {services.map((service) => <article className="service" key={service.day}><div className="service-day">{service.day.slice(0, 3)}</div><div><h3>{service.day}</h3><p>{service.label}</p></div><time>{service.time}</time></article>)}
        </div>
      </section>

      <section className="contact" id="contacto">
        <p className="section-kicker">Estamos cerca</p><h2>Nos encantaría conocerte.</h2>
        <p>Escríbenos para recibir información, pedir oración o planear tu primera visita.</p>
        <ContactForm />
        <div className="contact-actions"><a className="button button-outline" href="#horarios">Planear mi visita</a></div>
      </section>

      <section className="donations" id="donaciones">
        <div className="donations-copy">
          <p className="section-kicker light">Tu generosidad hace la diferencia</p>
          <h2>Apoya nuestra misión.</h2>
          <p>Cada donación nos ayuda a servir a nuestra comunidad, sostener nuestros ministerios y mantener abiertas las puertas de San Agustín.</p>
        </div>
        <div className="donation-options">
          <article className="donation-card">
            <span className="donation-icon" aria-hidden="true">$</span>
            <div><p>Donar con</p><h3>Cash App</h3><small>$PNL2026</small></div>
            <a className="button donation-button" href="https://cash.app/$PNL2026" target="_blank" rel="noopener noreferrer" data-track="cashapp_click">Abrir Cash App <span>→</span></a>
          </article>
          <article className="donation-card">
            <span className="donation-icon zelle-icon" aria-hidden="true">Z</span>
            <div><p>Enviar por</p><h3>Zelle</h3><small>Número registrado</small></div>
            <a className="zelle-number" href="tel:+17737984107" data-track="zelle_click">773-798-4107</a>
          </article>
          <p className="donation-note">Antes de enviar, verifica en tu aplicación que el destinatario sea el correcto.</p>
        </div>
      </section>

      <section className="app-section" id="aplicacion">
        <div className="app-badge" aria-hidden="true">✝</div>
        <div className="app-copy">
          <p className="section-kicker light">La iglesia en tu teléfono</p>
          <h2>Instala nuestra aplicación.</h2>
          <p>Guarda San Agustín en tu pantalla de inicio y activa los avisos para estar al día con misas, actividades y mensajes de la comunidad.</p>
        </div>
        <PwaControls />
      </section>

      <footer><a className="brand footer-brand" href="#inicio"><span className="brand-mark" aria-hidden="true">✝</span><span><strong>San Agustín</strong><small>Comunidad de fe</small></span></a><p>© 2026 Iglesia San Agustín. Estadísticas anónimas; los mensajes privados sólo se usan para responder.</p><a href="#inicio">Volver arriba ↑</a></footer>
    </main>
  );
}
