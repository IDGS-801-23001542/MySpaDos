import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, CalendarDays, Clock3, DoorOpen,
  MapPin, Search, ShieldCheck, WifiOff,
} from 'lucide-react';
import { api, localDateISO } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { useDebounce } from '../hooks/useDebounce.js';
import BookingGuests, { initialGuests, resizeGuests } from '../components/BookingGuests.jsx';
import { Alert, Brand, Empty, Field, PageHeader, PrimaryButton, Spinner } from '../components/UI.jsx';

function RoomArtwork({ room, online, large = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [room.photoUrl, online]);
  const local = /^\/rooms\/[^/]+\.webp$/.test(room.photoUrl || '');
  if (room.photoUrl && (online || local) && !failed) {
    return <img src={room.photoUrl} alt={`Fotografía de ${room.name}`} loading={large ? 'eager' : 'lazy'}
      onError={() => setFailed(true)} />;
  }
  return <div className="room-illustration" aria-label={`Imagen ilustrativa de ${room.name}`}>
    <DoorOpen size={large ? 110 : 62} strokeWidth={1} />
  </div>;
}

export default function RoomsPage() {
  const online = useOnlineStatus();
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');
  const debounced = useDebounce(q);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([api('/public/branches'), api('/public/rooms')])
      .then(([b, r]) => { if (!cancelled) { setBranches(b); setRooms(r); } })
      .catch((reason) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [online]);

  // A visit to the public catalogue prepares room details for offline reading.
  useEffect(() => {
    if (!online || !rooms.length || !import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined;
    let cancelled = false;
    let triggered = false;
    const prepare = () => {
      if (cancelled || triggered || !navigator.serviceWorker.controller) return;
      triggered = true;
      Promise.allSettled(rooms.slice(0, 30).map((room) => fetch(`/api/public/rooms/${room.id}`, {
        credentials: 'same-origin',
      }))).catch(() => {});
    };
    navigator.serviceWorker.addEventListener('controllerchange', prepare);
    navigator.serviceWorker.ready.then(prepare).catch(() => {});
    prepare();
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', prepare);
    };
  }, [rooms, online]);

  const filtered = useMemo(() => rooms.filter((room) => {
    if (branchId && room.branchId !== Number(branchId)) return false;
    const target = `${room.name} ${room.description}`.toLocaleLowerCase('es');
    return target.includes(debounced.trim().toLocaleLowerCase('es'));
  }), [rooms, branchId, debounced]);

  return <div className="container view-page">
    <PageHeader eyebrow="EXPLORA MYSPA2" title="Un espacio para cada momento"
      subtitle="Descubre salas diseñadas para brindarte una pausa especial." />
    {!online && <div className="myspa-offline-note" role="status">
      Estás sin conexión. Puedes consultar las salas visitadas o guardadas, pero no reservar ni revisar horarios.
    </div>}
    <div className="filter-bar">
      <div className="search-field"><Search size={18} />
        <input aria-label="Buscar salas" value={q} onChange={(event) => setQ(event.target.value)}
          placeholder="Buscar por nombre o descripción" />
      </div>
      <select aria-label="Filtrar sucursal" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
        <option value="">Todas las sucursales</option>
        {branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}
      </select>
    </div>
    <Alert>{error}</Alert>
    {loading ? <Spinner /> : filtered.length ? <div className="room-grid">
      {filtered.map((room, index) => <Link key={room.id} to={`/salas/${room.id}`}
        className={`room-card room-card-${index % 4}`}>
        <div className="room-card-image"><RoomArtwork room={room} online={online} />
          <span className="room-card-overline"><MapPin size={14} /> {room.branchName}</span>
        </div>
        <div className="room-card-body"><div><h3>{room.name}</h3><p>{room.description}</p></div>
          <span className="room-arrow"><ArrowUpRight size={20} /></span>
        </div>
      </Link>)}
    </div> : <Empty title={error ? 'No pudimos cargar las salas' : 'No encontramos salas'}
      description={error ? 'Conéctate y vuelve a intentarlo.' : 'Prueba con otro nombre o sucursal.'} />}
  </div>;
}

export function RoomPage() {
  const { id } = useParams();
  const { identity } = useAuth();
  const online = useOnlineStatus();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [scheduleId, setScheduleId] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [guests, setGuests] = useState(() => initialGuests(identity?.profile));
  const [treatments, setTreatments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const today = localDateISO();

  useEffect(() => {
    let cancelled = false;
    setRoom(null);
    setDate('');
    setScheduleId('');
    setPartySize(1);
    setGuests(initialGuests(identity?.profile));
    setError('');
    setSuccess('');
    setLoading(true);
    api(`/public/rooms/${id}`)
      .then((value) => { if (!cancelled) setRoom(value); })
      .catch((reason) => { if (!cancelled) setError(reason.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, online, identity?.user?.id]);

  useEffect(() => {
    if (!online) { setTreatments([]); return undefined; }
    let cancelled = false;
    api('/public/treatments').then((data) => {
      if (!cancelled) setTreatments(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [online]);

  useEffect(() => {
    if (!online || !date) { setSlots([]); setScheduleId(''); return undefined; }
    let cancelled = false;
    setScheduleId('');
    setSlots([]);
    api(`/public/availability?roomId=${id}&date=${date}`)
      .then((data) => { if (!cancelled) setSlots(data); })
      .catch((reason) => { if (!cancelled) setError(reason.message); });
    return () => { cancelled = true; };
  }, [id, date, online]);

  function changeSize(value) {
    const size = Number(value);
    setPartySize(size);
    setGuests((current) => resizeGuests(current, size));
  }

  async function reserve(event) {
    event.preventDefault();
    if (!online || !scheduleId || !identity) return;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api('/reservations', { method: 'POST', body: {
        roomId: Number(id), date, scheduleId: Number(scheduleId), partySize,
        guests: guests.slice(0, partySize).map((guest) => ({
          name: guest.name.trim(), phone: (guest.phone || '').trim(),
          treatmentIds: guest.treatmentIds || [],
        })),
      } });
      setSuccess('Reservación confirmada. El personal revisará los tratamientos solicitados durante tu visita.');
      setSlots((current) => current.map((slot) => slot.id === Number(scheduleId)
        ? { ...slot, available: false } : slot));
      setScheduleId('');
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }

  const validCoords = room && room.branch &&
    Number.isFinite(Number(room.branch.latitude)) &&
    Number.isFinite(Number(room.branch.longitude));
  const coords = validCoords ? `${room.branch.latitude},${room.branch.longitude}` : '';

  return <div className="container view-page">
    <Link className="back-link" to="/salas"><ArrowLeft size={16} /> Volver a salas</Link>
    {!online && <div className="myspa-offline-note" role="status">
      Vista informativa sin conexión. No se muestran horarios ni se pueden hacer reservaciones.
    </div>}
    <Alert>{error}</Alert>
    {loading && <Spinner />}
    {!loading && !room && <Empty title="No tenemos guardada esta sala"
      description="Abre Experiencias con internet para cargar los detalles antes de desconectarte." />}
    {room && <div className="room-detail-grid">
      <div>
        <div className="room-detail-art"><RoomArtwork room={room} online={online} large /></div>
        <div className="room-detail-copy">
          <span className="eyebrow">UNA PAUSA A TU MEDIDA</span>
          <h1>{room.name}</h1>
          <p>{room.description}</p>
          <div className="room-detail-facts">
            <span><MapPin size={18} /> {room.branch.name}</span>
            <span><ShieldCheck size={18} /> Espacio privado · hasta {room.capacity || 1}
              {(room.capacity || 1) === 1 ? ' persona' : ' personas'}</span>
          </div>
          <h3>Ubicación de la sucursal</h3>
          <p>{room.branch.address || 'Consulta la ubicación en el mapa.'}</p>
          {room.branch.municipality && <p>{[room.branch.municipality, room.branch.stateName,
            room.branch.postalCode].filter(Boolean).join(', ')}</p>}
          {online && validCoords ? <div className="map-frame">
            <iframe title={`Mapa de ${room.branch.name}`} loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(coords)}&z=14&output=embed`} />
          </div> : <div className="myspa-offline-map" role="status">
            {online ? <MapPin size={22} /> : <WifiOff size={22} />}
            <span>{online ? 'No hay coordenadas para esta sucursal.' : 'El mapa necesita conexión a internet.'}</span>
          </div>}
        </div>
      </div>
      <aside className="booking-panel">
        <div className="booking-brand"><Brand compact symbolOnly /></div>
        <span className="eyebrow">TU MOMENTO ES AHORA</span>
        <h2>Reserva tu espacio</h2>
        {!online ? <div className="myspa-offline-note">
          Conéctate para consultar horarios, indicar asistentes y confirmar la reservación.
        </div> : ['ADMIN', 'EMPLEADO'].includes(identity?.user?.role) ? <p>
          Utiliza el panel del personal para reservar en nombre de un cliente.
        </p> : <>
          <p>Selecciona un horario disponible. Una reserva ocupa la sala completa incluso cuando es para dos personas.</p>
          <form onSubmit={reserve} className="form-stack">
            <Field label="Personas">
              <select value={partySize} onChange={(event) => changeSize(event.target.value)}>
                <option value={1}>1 persona</option>
                {(room.capacity || 1) >= 2 && <option value={2}>2 personas · experiencia en pareja</option>}
              </select>
            </Field>
            {identity && <BookingGuests guests={guests} onChange={setGuests}
              partySize={partySize} treatments={treatments} />}
            <Field label="Fecha de la visita">
              <input type="date" min={today} required value={date}
                onChange={(event) => setDate(event.target.value)} />
            </Field>
            <Field label="Horario disponible">
              <select required disabled={!date} value={scheduleId}
                onChange={(event) => setScheduleId(event.target.value)}>
                <option value="">Selecciona una hora</option>
                {slots.map((slot) => <option key={slot.id} value={slot.id}
                  disabled={!slot.available}>{slot.start} – {slot.end}{!slot.available && ' · Ocupado'}</option>)}
              </select>
            </Field>
            {success && <Alert type="success">{success}</Alert>}
            {!identity ? <Link className="button button-primary button-center" to="/acceso">
              Inicia sesión para reservar <ArrowUpRight size={18} />
            </Link> : <PrimaryButton busy={busy} type="submit" disabled={!scheduleId}>
              <CalendarDays size={17} /> Confirmar reservación
            </PrimaryButton>}
          </form>
        </>}
        <div className="booking-help"><Clock3 size={18} />
          <span>Los tratamientos son preferencias, no cobros. El servicio real y los consumos se registran después.</span>
        </div>
      </aside>
    </div>}
  </div>;
}
