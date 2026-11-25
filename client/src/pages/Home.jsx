import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarCheck2, DoorOpen, Heart, Hourglass, Leaf, MapPin, ShieldCheck, Sparkles, Waves } from 'lucide-react';
import { api, publicRoomPhoto } from '../lib.js';
import { Empty, StatusBadge } from '../components/UI.jsx';
import BrandFlower from '../components/BrandFlower.jsx';

const benefits = [
  { icon: Hourglass, title: 'Tu tiempo, tu ritmo', text: 'Momentos diseñados para recuperar la calma, sin prisas.' },
  { icon: Leaf, title: 'Bienestar consciente', text: 'Espacios cálidos, experiencias cuidadas y detalles naturales.' },
  { icon: Heart, title: 'Atención personal', text: 'Elige el espacio y horario que mejor acompañe tu día.' },
];

// Each editorial image is local and corresponds to a concrete treatment.
const featuredRituals = [
  { name: 'Envoltura de karité', photo: '/treatments/karite.webp' },
  { name: 'Exfoliación de sal', photo: '/treatments/sal.webp' },
  { name: 'Facial de avena', photo: '/treatments/avena.webp' },
  { name: 'Facial de rocío', photo: '/treatments/rocio.webp' },
];

function ritualKey(name) {
  return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export default function HomePage() {
  const [rooms, setRooms] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [activeRoom, setActiveRoom] = useState(0);
  const carouselRef = useRef(null);

  const displayedRooms = rooms.slice(0, 3);

  function goToRoom(index) {
    const container = carouselRef.current;
    if (!container) return;

    const nextIndex = Math.max(0, Math.min(index, displayedRooms.length - 1));
    const firstCard = container.firstElementChild;
    const selectedCard = container.children[nextIndex];
    if (!firstCard || !selectedCard) return;

    container.scrollTo({
      left: selectedCard.offsetLeft - firstCard.offsetLeft,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    setActiveRoom(nextIndex);
  }

  function updateActiveRoom(event) {
    const container = event.currentTarget;
    const firstCard = container.firstElementChild;
    if (!firstCard) return;

    const styles = getComputedStyle(container);
    const gap = parseFloat(styles.columnGap) || 0;
    const step = firstCard.getBoundingClientRect().width + gap;
    if (step > 0) {
      setActiveRoom(Math.min(displayedRooms.length - 1, Math.max(0, Math.round(container.scrollLeft / step))));
    }
  }

  useEffect(() => {
    api('/public/rooms').then(setRooms).catch(() => setRooms([]));
    api('/public/treatments').then(setTreatments).catch(() => setTreatments([]));
  }, []);

  const featured = featuredRituals.map((ritual) => {
    const treatment = treatments.find((entry) => ritualKey(entry.name) === ritualKey(ritual.name));
    return treatment ? { ...treatment, photo: ritual.photo } : null;
  }).filter(Boolean);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={14} /> UN RESPIRO EN TU DÍA</div>
          <h1>Donde la calma <em>encuentra su lugar.</em></h1>
          <p>Un espacio creado para desconectar del ruido y volver a ti. Descubre salas de spa, rituales de bienestar y una experiencia que se siente como una pausa.</p>
          <div className="hero-cta">
            <Link to="/salas" className="button button-light">Explorar experiencias <ArrowUpRight size={18} /></Link>
            <span>Tu momento empieza aquí.</span>
          </div>
          <div className="hero-mini"><span><CalendarCheck2 size={16} /> Reserva en minutos</span><span><ShieldCheck size={16} /> Atención personalizada</span></div>
        </div>
        <div className="hero-art" aria-label="Ilustración abstracta de bienestar">
          <div className="hero-aura hero-aura-one" /><div className="hero-aura hero-aura-two" />
          <div className="hero-art-frame"><div className="hero-art-circle"><BrandFlower size={172} /></div></div>
          <div className="hero-art-note"><span>01 / 03</span><strong>Respira.</strong><small>Este momento es tuyo</small></div>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="section-heading"><span className="eyebrow">NUESTRA ESENCIA</span><h2>El arte de sentirte bien</h2><p>Un acercamiento más simple y delicado a tu bienestar.</p></div>
        <div className="benefit-grid">
          {benefits.map(({ icon: Icon, title, text }) => <article className="benefit-card" key={title}>
            <div className="benefit-icon"><Icon size={27} strokeWidth={1.45} /></div><h3>{title}</h3><p>{text}</p>
          </article>)}
        </div>
      </section>

      <section className="section"><div className="section-title-row">
        <div><span className="eyebrow">NUESTROS ESPACIOS</span><h2>Encuentra tu refugio</h2><p>Salas pensadas para bajar el ritmo y reconectar.</p></div>
        <Link className="text-link" to="/salas">Ver todas las salas <ArrowUpRight size={18} /></Link>
      </div>
        {displayedRooms.length ? (
          <>
            <div
              ref={carouselRef}
              className="room-grid room-grid-featured"
              onScroll={updateActiveRoom}
              aria-label="Salas destacadas de MySpa2"
            >
              {displayedRooms.map((room, i) => (
                <Link
                  key={room.id}
                  to={`/salas/${room.id}`}
                  className={`room-card room-card-${i % 4}`}
                >
                  <div className="room-card-image">
                    {room.photoUrl ? (
                      <img src={publicRoomPhoto(room.photoUrl)} alt={room.name} />
                    ) : (
                      <div className="room-illustration"><DoorOpen size={70} strokeWidth={0.9} /></div>
                    )}
                    <span className="room-card-overline"><MapPin size={14} />{room.branchName}</span>
                  </div>
                  <div className="room-card-body">
                    <div><h3>{room.name}</h3><p>{room.description}</p></div>
                    <span className="room-arrow"><ArrowUpRight size={20} /></span>
                  </div>
                </Link>
              ))}
            </div>
            {displayedRooms.length > 1 && (
              <div className="featured-carousel-controls" aria-label="Controles del carrusel de salas">
                <button
                  type="button"
                  className="featured-carousel-arrow"
                  onClick={() => goToRoom(activeRoom - 1)}
                  disabled={activeRoom === 0}
                  aria-label="Sala anterior"
                ><ArrowLeft size={19} /></button>
                <div className="featured-carousel-dots">
                  {displayedRooms.map((room, index) => (
                    <button
                      type="button"
                      key={room.id}
                      aria-label={`Mostrar ${room.name}`}
                      aria-current={index === activeRoom ? 'true' : undefined}
                      className={index === activeRoom ? 'featured-carousel-dot active' : 'featured-carousel-dot'}
                      onClick={() => goToRoom(index)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="featured-carousel-arrow"
                  onClick={() => goToRoom(activeRoom + 1)}
                  disabled={activeRoom === displayedRooms.length - 1}
                  aria-label="Sala siguiente"
                ><ArrowRight size={19} /></button>
              </div>
            )}
          </>
        ) : (
          <Empty title="Las salas están por florecer" description="Ejecuta el seed para cargar las salas de demostración." />
        )}
      </section>

      <section className="editorial-panel"><div className="editorial-art"><Waves size={116} strokeWidth={0.6} /><Leaf size={54} strokeWidth={0.7} /></div>
        <div className="editorial-copy"><span className="eyebrow">UN RITUAL PARA TI</span><h2>Menos prisa.<br /><em>Más presencia.</em></h2>
          <p>Un pequeño descanso puede cambiar el ritmo del día. Elige tu experiencia, reserva tu espacio y deja que lo demás espere.</p>
          <Link to="/salas" className="button button-primary">Elegir mi momento <ArrowUpRight size={18} /></Link>
        </div></section>

      <section className="section"><div className="section-heading"><span className="eyebrow">EXPERIENCIAS</span><h2>Rituales para reconectar</h2><p>Cuidados que encuentran belleza en lo esencial.</p></div>
        <div className="treatment-preview-grid">
          {featured.map((treatment, i) => (
            <article className="treatment-preview" key={treatment.id}>
              <div className="treatment-preview-image">
                <img src={treatment.photo} alt={`Fotografía del ritual ${treatment.name}`} loading="lazy" />
                <span className="treatment-number">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="treatment-preview-copy">
                <h3>{treatment.name}</h3>
                <p>{treatment.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
