'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronRight,
  CircleDollarSign,
  CloudOff,
  Fingerprint,
  Gauge,
  Menu,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useRef } from 'react';

gsap.registerPlugin(useGSAP);

const payments = [
  { amount: 'S/ 48.00', name: 'Camila R.', status: 'Confirmado', time: 'Ahora' },
  { amount: 'S/ 22.50', name: 'Mateo Silva', status: 'Confirmado', time: 'Hace 2 min' },
  { amount: 'S/ 85.00', name: 'Lucía Torres', status: 'Confirmado', time: 'Hace 5 min' },
];

const flow = [
  {
    description: 'El Android de tu negocio reconoce una confirmación válida de la billetera configurada.',
    icon: BellRing,
    index: '01',
    title: 'Detecta',
  },
  {
    description: 'Yallegó la transforma en un movimiento claro, con importe, hora y estado.',
    icon: Zap,
    index: '02',
    title: 'Ordena',
  },
  {
    description: 'Tu equipo ve la misma señal y continúa la atención sin cambiar de contexto.',
    icon: Radio,
    index: '03',
    title: 'Confirma',
  },
];

function Wordmark() {
  return (
    <span className="landing-wordmark" aria-label="Yallegó">
      <span className="landing-wordmark-mark" aria-hidden="true">
        ¿
      </span>
      <span>Yallegó</span>
    </span>
  );
}

function ArrowLink({ children, href }: Readonly<{ children: ReactNode; href: string }>) {
  return (
    <Link className="landing-arrow-link" href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" size={15} strokeWidth={1.7} />
    </Link>
  );
}

function SignalWave() {
  return (
    <svg
      aria-hidden="true"
      className="landing-signal-wave"
      preserveAspectRatio="none"
      viewBox="0 0 620 150"
    >
      <defs>
        <linearGradient id="signal-line" x1="0" x2="1">
          <stop offset="0" stopColor="#7178ff" stopOpacity="0" />
          <stop offset="0.3" stopColor="#8d91ff" />
          <stop offset="0.7" stopColor="#82efd1" />
          <stop offset="1" stopColor="#82efd1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="signal-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7278ff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#7278ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="landing-signal-area"
        d="M0 123 C45 121 64 114 97 113 S149 84 182 88 S229 83 264 80 S310 66 342 69 S386 39 421 48 S467 40 496 35 S548 25 620 15 L620 150 L0 150 Z"
        fill="url(#signal-area)"
      />
      <path
        className="landing-signal-line"
        d="M0 123 C45 121 64 114 97 113 S149 84 182 88 S229 83 264 80 S310 66 342 69 S386 39 421 48 S467 40 496 35 S548 25 620 15"
        fill="none"
        stroke="url(#signal-line)"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle className="landing-signal-point" cx="496" cy="35" fill="#b7ffea" r="4" />
    </svg>
  );
}

function ProductPreview() {
  return (
    <div
      aria-label="Vista ilustrativa del espacio operativo de Yallegó"
      className="landing-product-stage"
      data-landing-reveal
      role="img"
    >
      <div className="landing-stage-glow" />
      <div className="landing-product-window">
        <header className="landing-product-topbar">
          <Wordmark />
          <div className="landing-window-nav" aria-hidden="true">
            <span className="is-current">Inicio</span>
            <span>Transacciones</span>
            <span>Dispositivos</span>
          </div>
          <div className="landing-window-avatar">P</div>
        </header>

        <div className="landing-product-body">
          <aside className="landing-product-sidebar" aria-hidden="true">
            <div className="landing-sidebar-head">
              <span className="landing-sidebar-avatar">P</span>
              <span>
                <small>NEGOCIO</small>
                Punto Norte
              </span>
            </div>
            <div className="landing-sidebar-line is-active" />
            <div className="landing-sidebar-line" />
            <div className="landing-sidebar-line is-short" />
            <div className="landing-sidebar-space" />
            <div className="landing-sidebar-line" />
            <div className="landing-sidebar-line is-short" />
          </aside>

          <main className="landing-product-main">
            <div className="landing-product-heading">
              <div>
                <span className="landing-kicker">OPERACIÓN DE HOY</span>
                <h2>Todo en orden.</h2>
                <p>Tu negocio está recibiendo confirmaciones.</p>
              </div>
              <div className="landing-live-pill">
                <span /> En vivo
              </div>
            </div>

            <div className="landing-product-grid">
              <section className="landing-signal-card">
                <header>
                  <div>
                    <span className="landing-kicker">COBRADO HOY</span>
                    <strong>S/ 155.50</strong>
                  </div>
                  <span className="landing-delta">+3 cobros</span>
                </header>
                <SignalWave />
                <footer>
                  <span>09:00</span>
                  <span>12:00</span>
                  <span>Ahora</span>
                </footer>
              </section>

              <section className="landing-device-card">
                <div className="landing-device-orbit">
                  <span className="landing-orbit-ring" />
                  <span className="landing-orbit-ring is-two" />
                  <span className="landing-device-core">
                    <Smartphone size={21} strokeWidth={1.6} />
                  </span>
                </div>
                <span className="landing-kicker">ANDROID DE COBROS</span>
                <strong>Conectado</strong>
                <p>Última señal: ahora</p>
              </section>
            </div>

            <section className="landing-payment-list">
              <header>
                <div>
                  <span className="landing-kicker">MOVIMIENTOS RECIENTES</span>
                  <strong>Confirmaciones de pago</strong>
                </div>
                <span>Ver todas <ChevronRight size={13} /></span>
              </header>
              <div className="landing-payment-table">
                {payments.map((payment) => (
                  <div className="landing-payment-row" key={payment.name}>
                    <span className="landing-payment-icon">
                      <Check size={12} strokeWidth={2.4} />
                    </span>
                    <span className="landing-payment-person">
                      <strong>{payment.name}</strong>
                      <small>Yape</small>
                    </span>
                    <strong>{payment.amount}</strong>
                    <span className="landing-payment-status">{payment.status}</span>
                    <time>{payment.time}</time>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>

      <div className="landing-phone-notification">
        <span className="landing-phone-app">Y</span>
        <span>
          <small>YAPE · AHORA</small>
          <strong>¡Recibiste S/ 48.00!</strong>
          <em>Camila R. te envió un pago.</em>
        </span>
        <span className="landing-notification-check">
          <Check size={14} strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}

function OfflineQueuePreview() {
  return (
    <div className="landing-queue-preview" aria-hidden="true">
      <div className="landing-queue-topline">
        <span className="landing-queue-icon"><CloudOff size={16} /></span>
        <span>
          <small>ESTADO DEL DISPOSITIVO</small>
          <strong>Sin internet</strong>
        </span>
        <span className="landing-queue-count">3 pendientes</span>
      </div>
      <div className="landing-queue-path">
        <span className="landing-queue-node is-ready"><BellRing size={16} /></span>
        <span className="landing-queue-track"><i /></span>
        <span className="landing-queue-node is-waiting"><CloudOff size={16} /></span>
        <span className="landing-queue-track is-muted"><i /></span>
        <span className="landing-queue-node"><Wifi size={16} /></span>
      </div>
      <div className="landing-queue-labels">
        <span>Capturado</span>
        <span>En espera</span>
        <span>Sincronizado</span>
      </div>
      <div className="landing-queue-events">
        <span><i /> S/ 10.00 <small>guardado en el dispositivo</small></span>
        <span><i /> S/ 20.00 <small>guardado en el dispositivo</small></span>
        <span><i /> S/ 30.00 <small>guardado en el dispositivo</small></span>
      </div>
      <div className="landing-queue-restored">
        <Wifi size={15} /> Conexión recuperada <span>Reintentando ahora</span>
      </div>
    </div>
  );
}

function AuditPreview() {
  const events = [
    ['Dispositivo vinculado', 'Hoy, 09:14'],
    ['Billetera activada', 'Hoy, 09:16'],
    ['Cobro confirmado', 'Hoy, 09:24'],
  ];

  return (
    <div className="landing-audit-preview" aria-hidden="true">
      <header>
        <span><Fingerprint size={17} /> Registro de actividad</span>
        <small>EN TIEMPO REAL</small>
      </header>
      <div className="landing-audit-events">
        {events.map(([event, time], index) => (
          <div className="landing-audit-event" key={event}>
            <span className="landing-audit-dot"><Check size={11} /></span>
            <span>
              <strong>{event}</strong>
              <small>Operación verificada por Yallegó</small>
            </span>
            <time>{time}</time>
            {index < events.length - 1 ? <i /> : null}
          </div>
        ))}
      </div>
      <footer>
        <ShieldCheck size={18} />
        <span><strong>Control visible</strong><small>Permisos, estados y acciones importantes.</small></span>
      </footer>
    </div>
  );
}

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add('(prefers-reduced-motion: no-preference)', () => {
        const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
        timeline
          .fromTo('.landing-nav-inner', { autoAlpha: 0, y: -14 }, { autoAlpha: 1, duration: 0.7, y: 0 })
          .fromTo(
            '.landing-hero [data-hero]',
            { autoAlpha: 0, y: 26 },
            { autoAlpha: 1, duration: 0.9, stagger: 0.08, y: 0 },
            '-=0.4',
          )
          .fromTo(
            '.landing-product-stage',
            { autoAlpha: 0, rotateX: 5, scale: 0.97, y: 42 },
            { autoAlpha: 1, duration: 1.15, rotateX: 0, scale: 1, y: 0 },
            '-=0.5',
          );

        const revealItems = Array.from(
          root.current?.querySelectorAll<HTMLElement>('[data-landing-reveal]:not(.landing-product-stage)') ?? [],
        );
        revealItems.forEach((item) => {
          gsap.set(item, { autoAlpha: 0, y: 32 });
        });

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting && entry.boundingClientRect.top >= window.innerHeight) return;
              observer.unobserve(entry.target);
              gsap.to(entry.target, {
                autoAlpha: 1,
                clearProps: 'opacity,visibility,transform',
                duration: 0.85,
                ease: 'power3.out',
                y: 0,
              });
            });
          },
          { rootMargin: '120px 0px -5%', threshold: 0.01 },
        );
        revealItems.forEach((item) => observer.observe(item));

        return () => observer.disconnect();
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <div className="landing-page" ref={root}>
      <a className="landing-skip-link" href="#contenido">Saltar al contenido</a>

      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link className="landing-logo-link" href="/" aria-label="Yallegó, inicio">
            <Wordmark />
          </Link>
          <nav className="landing-nav-links" aria-label="Navegación principal">
            <a href="#producto">Producto</a>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#continuidad">Continuidad</a>
            <a href="#seguridad">Seguridad</a>
          </nav>
          <div className="landing-nav-actions">
            <Link className="landing-login" href="/login">Iniciar sesión</Link>
            <Link className="landing-nav-cta" href="/registro">
              Crear cuenta <ArrowRight size={14} strokeWidth={1.8} />
            </Link>
          </div>
          <details className="landing-mobile-menu">
            <summary aria-label="Abrir menú">
              <Menu className="landing-menu-open" size={20} />
              <X className="landing-menu-close" size={20} />
            </summary>
            <nav aria-label="Navegación móvil">
              <a href="#producto">Producto</a>
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#continuidad">Continuidad</a>
              <a href="#seguridad">Seguridad</a>
              <Link href="/login">Iniciar sesión</Link>
              <Link className="landing-mobile-cta" href="/registro">Crear cuenta</Link>
            </nav>
          </details>
        </div>
      </header>

      <main id="contenido">
        <section className="landing-hero">
          <div className="landing-hero-aura" aria-hidden="true" />
          <div className="landing-hero-grid" aria-hidden="true" />
          <div className="landing-container landing-hero-content">
            <div className="landing-eyebrow" data-hero>
              <span className="landing-eyebrow-pulse" />
              Operación de cobros, en tiempo real
            </div>
            <h1 data-hero>
              La respuesta a <span>“¿ya llegó?”</span><br />
              vive en un solo lugar.
            </h1>
            <p className="landing-hero-copy" data-hero>
              Yallegó conecta el Android de tu negocio con un espacio operativo que detecta,
              ordena y confirma tus cobros de Yape.
            </p>
            <div className="landing-hero-actions" data-hero>
              <Link className="landing-primary-cta" href="/registro">
                Crear mi espacio <ArrowRight size={17} strokeWidth={1.8} />
              </Link>
              <a className="landing-secondary-cta" href="#producto">Ver cómo funciona</a>
            </div>
            <div className="landing-hero-note" data-hero>
              <span><Check size={13} /> Configuración guiada</span>
              <span><Check size={13} /> Un Android dedicado</span>
              <span><Check size={13} /> Control desde la web</span>
            </div>
          </div>
          <div className="landing-container landing-hero-preview">
            <ProductPreview />
          </div>
        </section>

        <section className="landing-use-strip" aria-label="Negocios que pueden usar Yallegó">
          <div className="landing-container">
            <span>HECHO PARA NEGOCIOS QUE NO PUEDEN DETENERSE</span>
            <div>
              <strong>Tiendas</strong><i />
              <strong>Restaurantes</strong><i />
              <strong>Servicios</strong><i />
              <strong>Equipos de venta</strong>
            </div>
          </div>
        </section>

        <section className="landing-intro" id="producto">
          <div className="landing-container">
            <header className="landing-section-heading" data-landing-reveal>
              <span className="landing-section-index">01 / PRODUCTO</span>
              <h2>Una pregunta menos<br />en cada venta.</h2>
              <p>
                El comprobante deja de vivir en una pantalla aislada. Yallegó lo convierte en
                una señal compartida, clara y lista para actuar.
              </p>
            </header>

            <div className="landing-flow-grid" id="como-funciona">
              {flow.map(({ description, icon: Icon, index, title }) => (
                <article className="landing-flow-card" data-landing-reveal key={title}>
                  <div className="landing-flow-card-head">
                    <span>{index}</span>
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <div className="landing-flow-line"><span /></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-feature landing-feature-live">
          <div className="landing-container landing-feature-grid">
            <div className="landing-feature-copy" data-landing-reveal>
              <span className="landing-section-index">02 / UNA SOLA SEÑAL</span>
              <h2>Tu equipo ve el cobro cuando importa.</h2>
              <p>
                Importe, remitente, billetera y estado aparecen juntos. Sin revisar capturas,
                sin preguntar por chat y sin perder el ritmo de atención.
              </p>
              <ul>
                <li><Check size={15} /> Movimientos ordenados por hora</li>
                <li><Check size={15} /> Estado operativo del dispositivo</li>
                <li><Check size={15} /> Confirmación compartida para el equipo</li>
              </ul>
              <ArrowLink href="/registro">Empezar con Yallegó</ArrowLink>
            </div>

            <div className="landing-live-preview" data-landing-reveal aria-hidden="true">
              <div className="landing-live-beam" />
              <div className="landing-live-device">
                <span className="landing-live-device-top"><i /> Android de cobros <small>EN LÍNEA</small></span>
                <div className="landing-live-phone">
                  <span className="landing-live-phone-status">12:42 <i /><i /><i /></span>
                  <div className="landing-live-phone-content">
                    <span className="landing-phone-app">Y</span>
                    <small>YAPE</small>
                    <strong>¡Recibiste S/ 48.00!</strong>
                    <p>Camila R. te envió un pago.</p>
                  </div>
                </div>
              </div>
              <div className="landing-live-event">
                <span className="landing-event-badge"><Check size={13} /></span>
                <span><small>COBRO CONFIRMADO</small><strong>S/ 48.00</strong></span>
                <span><strong>Camila R.</strong><small>Ahora · Yape</small></span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-feature landing-feature-queue" id="continuidad">
          <div className="landing-container landing-feature-grid is-reversed">
            <div data-landing-reveal>
              <OfflineQueuePreview />
            </div>
            <div className="landing-feature-copy" data-landing-reveal>
              <span className="landing-section-index">03 / CONTINUIDAD</span>
              <h2>La conexión puede esperar. El cobro, no.</h2>
              <p>
                Si el teléfono permanece encendido pero pierde internet, las notificaciones
                capturadas se guardan en una cola local y se reintentan cuando vuelve la conexión.
              </p>
              <div className="landing-precision-note">
                <CloudOff size={18} strokeWidth={1.5} />
                <span>
                  <strong>Diseñado para conexiones reales</strong>
                  <small>Puedes ver cuántos eventos están pendientes desde el dispositivo.</small>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-feature landing-feature-trust" id="seguridad">
          <div className="landing-container landing-feature-grid">
            <div className="landing-feature-copy" data-landing-reveal>
              <span className="landing-section-index">04 / CONTROL</span>
              <h2>Operación visible. Permisos bajo control.</h2>
              <p>
                Yallegó procesa las billeteras configuradas y te muestra el estado de cada
                dispositivo. Las acciones importantes quedan registradas para que sepas qué pasó.
              </p>
              <div className="landing-trust-points">
                <span><ShieldCheck size={18} /><strong>Acceso controlado</strong><small>Permisos administrados desde Android.</small></span>
                <span><Gauge size={18} /><strong>Estado observable</strong><small>Señal, conexión y cola en contexto.</small></span>
              </div>
            </div>
            <div data-landing-reveal>
              <AuditPreview />
            </div>
          </div>
        </section>

        <section className="landing-principles">
          <div className="landing-container">
            <div className="landing-principles-heading" data-landing-reveal>
              <span className="landing-section-index">DISEÑADO PARA OPERAR</span>
              <h2>Menos interfaz.<br />Más certeza.</h2>
            </div>
            <div className="landing-principles-grid">
              <article data-landing-reveal>
                <CircleDollarSign size={21} strokeWidth={1.4} />
                <h3>El cobro primero</h3>
                <p>Cada pantalla prioriza la señal que tu equipo necesita para continuar.</p>
              </article>
              <article data-landing-reveal>
                <Sparkles size={21} strokeWidth={1.4} />
                <h3>Calma operativa</h3>
                <p>Estados claros y una jerarquía visual que reduce decisiones innecesarias.</p>
              </article>
              <article data-landing-reveal>
                <Smartphone size={21} strokeWidth={1.4} />
                <h3>Un puente simple</h3>
                <p>Tu Android captura. Yallegó organiza. Tu equipo atiende.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-final-orbit" aria-hidden="true" />
          <div className="landing-container" data-landing-reveal>
            <span className="landing-final-icon"><Radio size={22} strokeWidth={1.4} /></span>
            <p>Tu próxima confirmación puede ser más simple.</p>
            <h2>Deja de preguntar.<br /><span>Empieza a saber.</span></h2>
            <div className="landing-hero-actions">
              <Link className="landing-primary-cta" href="/registro">
                Crear mi espacio <ArrowRight size={17} strokeWidth={1.8} />
              </Link>
              <Link className="landing-secondary-cta" href="/login">Ya tengo una cuenta</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-main">
          <div>
            <Wordmark />
            <p>Confirmaciones de pago para negocios que no se detienen.</p>
          </div>
          <div className="landing-footer-links">
            <div><strong>Producto</strong><a href="#como-funciona">Cómo funciona</a><a href="#continuidad">Continuidad</a><a href="#seguridad">Seguridad</a></div>
            <div><strong>Acceso</strong><Link href="/registro">Crear cuenta</Link><Link href="/login">Iniciar sesión</Link><Link href="/documentacion">Documentación</Link></div>
          </div>
        </div>
        <div className="landing-container landing-footer-bottom">
          <span>© {new Date().getFullYear()} Yallegó</span>
          <span>Hecho para cobrar con certeza.</span>
        </div>
      </footer>
    </div>
  );
}
