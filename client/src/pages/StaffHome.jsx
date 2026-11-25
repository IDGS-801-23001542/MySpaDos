import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, ArrowUpRight, CalendarCheck2, CalendarClock, CalendarDays,
  CheckCircle2, Clock3, DoorOpen, HandHeart, PackageX, RefreshCw, Sparkles,
  UserX, Users, Wallet,
} from 'lucide-react';
import { api, money, shortDate } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import { Alert, Empty, PageHeader, Spinner, StatusBadge } from '../components/UI.jsx';
import '../styles/dashboard.css';

const SPA_ZONE = 'America/Mexico_City';

function friendlyDay(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: SPA_ZONE,
  }).format(new Date(`${date}T12:00:00-06:00`));
}

function weekDay(date) {
  return new Intl.DateTimeFormat('es-MX', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00.000Z`)).replace('.', '');
}

function AppointmentList({ items, showDate = false, isAdmin = false, limit = 8 }) {
  if (!items?.length) return <Empty title={showDate ? 'Todavía no hay citas próximas' : 'Hoy no hay reservaciones'}
    description={showDate ? 'Las nuevas reservaciones aparecerán aquí automáticamente.' : 'La agenda de hoy está libre por el momento.'} />;
  return <>
    <div className="overview-appointments">
      {items.slice(0, limit).map((booking) => <article className="overview-appointment" key={booking.id}>
        <div className="overview-appointment-time">
          <strong>{booking.start || '—'}</strong>
          <small>{booking.end || ''}</small>
        </div>
        <div className="overview-appointment-info">
          <strong>{booking.clientName || 'Cliente'}</strong>
          <span>{booking.roomName || 'Sala'}{isAdmin && booking.branchName ? ` · ${booking.branchName}` : ''}</span>
          {showDate && <small>{shortDate(booking.date)}</small>}
        </div>
        <div className="overview-appointment-status"><StatusBadge value={booking.status} /></div>
      </article>)}
    </div>
    {items.length > limit && <p className="overview-more">Mostrando {limit} de {items.length} reservaciones. Consulta la agenda para ver todas.</p>}
  </>;
}

function WeekActivity({ days = [] }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  return <div className="overview-week" aria-label="Reservaciones de los próximos siete días">
    {days.map((day, index) => <div className="overview-week-day" key={day.date}>
      <span className="overview-week-value">{day.count}</span>
      <div className="overview-week-track" title={`${day.date}: ${day.count} reservaciones`}>
        <span className={index === 0 ? 'overview-week-bar overview-week-current' : 'overview-week-bar'}
          style={{ height: `${(day.count / max) * 100}%` }} />
      </div>
      <strong>{index === 0 ? 'Hoy' : weekDay(day.date)}</strong>
      <small>{Number(day.date.slice(-2))}</small>
    </div>)}
  </div>;
}

export default function StaffHome() {
  const { identity } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(false);
  const load = useCallback(async () => {
    if (mounted.current) setRefreshing(true);
    try {
      const data = await api('/dashboard');
      if (mounted.current) { setStats(data); setError(''); }
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 60_000);
    const update = () => load();
    window.addEventListener('focus', update);
    window.addEventListener('myspa:reservations-updated', update);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener('myspa:reservations-updated', update);
    };
  }, [load]);

  const admin = identity?.user?.role === 'ADMIN';
  const today = stats?.today || { total: 0, pending: 0, attended: 0, canceled: 0, noShow: 0 };
  const metrics = stats ? [
    { label: 'Reservaciones hoy', value: today.total, helper: 'Todas las citas del día', icon: CalendarDays, tone: 'sage' },
    { label: 'Por atender hoy', value: today.pending, helper: 'Pendientes de atención', icon: Clock3, tone: 'sand' },
    { label: 'Atendidas hoy', value: today.attended, helper: 'Servicios completados', icon: CheckCircle2, tone: 'pearl' },
    { label: 'Próximas reservaciones', value: stats.upcomingCount, helper: 'Con inicio futuro', icon: CalendarClock, tone: 'rose' },
  ] : [];
  const statusRows = [
    { key: 'pending', title: 'Pendientes', count: today.pending, color: 'pending' },
    { key: 'attended', title: 'Atendidas', count: today.attended, color: 'attended' },
    { key: 'canceled', title: 'Canceladas', count: today.canceled, color: 'canceled' },
    { key: 'noShow', title: 'No asistió', count: today.noShow, color: 'noshow' },
  ];

  return <div className="staff-view overview-page">
    <PageHeader eyebrow="VISTA GENERAL" title={`Hola, ${identity?.profile?.name || 'equipo'}`}
      subtitle="El estado de las citas y servicios, en un solo lugar."
      actions={<button type="button" className="button button-outline" disabled={refreshing} onClick={load}>
        <RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Actualizar datos
      </button>} />
    <Alert>{error}</Alert>
    {!stats ? !error && <Spinner /> : <>
      <section className="overview-hero">
        <div className="overview-hero-content">
          <span className="overview-hero-kicker"><Sparkles size={15} /> EL PULSO DE TU SPA</span>
          <h2>Tu agenda, en calma y bajo control.</h2>
          <p>{stats.scopeLabel} · {friendlyDay(stats.todayDate)}</p>
          <Link to="/personal/reservaciones" className="button overview-hero-button">
            Abrir agenda <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="overview-hero-highlight" aria-label="Resumen de citas de hoy">
          <CalendarCheck2 size={24} strokeWidth={1.5} />
          <span>Reservaciones para hoy</span>
          <strong>{today.total}</strong>
          <small>{today.pending} pendientes · {today.attended} atendidas</small>
        </div>
      </section>

      {stats.pendingReview > 0 && <div className="overview-attention" role="status">
        <Clock3 size={20} /><p><strong>{stats.pendingReview} {stats.pendingReview === 1 ? 'cita necesita' : 'citas necesitan'} revisión de asistencia.</strong>
          {' '}Su horario ya terminó, pero aún no se ha registrado el servicio.</p>
        <Link to="/personal/reservaciones">Revisar <ArrowRight size={16} /></Link>
      </div>}

      <div className="overview-metrics">{metrics.map(({ label, value, helper, icon: Icon, tone }) =>
        <div className={`overview-metric overview-metric-${tone}`} key={label}>
          <div className="overview-metric-top"><span>{label}</span><Icon size={21} strokeWidth={1.7} /></div>
          <strong>{value}</strong><small>{helper}</small>
        </div>)}</div>

      <div className="overview-lists">
        <section className="surface-card overview-panel">
          <div className="overview-section-heading"><div><span className="eyebrow">ATENCIÓN DEL DÍA</span><h2>Reservaciones de hoy</h2>
            <p>Ordenadas por hora de inicio.</p></div><Link to="/personal/reservaciones" className="text-link">Ver agenda <ArrowUpRight size={16} /></Link></div>
          <AppointmentList items={stats.todayReservations} isAdmin={admin} />
        </section>
        <section className="surface-card overview-panel">
          <div className="overview-section-heading"><div><span className="eyebrow">LO QUE VIENE</span><h2>Próximas reservaciones</h2>
            <p>Citas pendientes que todavía no comienzan.</p></div><Link to="/personal/reservaciones" className="text-link">Ver todas <ArrowUpRight size={16} /></Link></div>
          <AppointmentList items={stats.upcomingReservations} showDate isAdmin={admin} />
        </section>
      </div>

      <div className="overview-bottom">
        <section className="surface-card overview-panel overview-week-panel">
          <div className="overview-section-heading"><div><span className="eyebrow">TENDENCIA DE LA AGENDA</span><h2>Los próximos 7 días</h2>
            <p>Reservaciones pendientes o atendidas por fecha. No incluye cancelaciones ni ausencias.</p></div><Activity size={25} strokeWidth={1.5} /></div>
          <WeekActivity days={stats.nextSevenDays} />
        </section>
        <section className="surface-card overview-panel overview-status-panel">
          <div className="overview-section-heading"><div><span className="eyebrow">SEGUIMIENTO</span><h2>Estados de hoy</h2></div></div>
          {statusRows.map((item) => <div className="overview-status-row" key={item.key}>
            <div><span className={`overview-status-dot overview-status-${item.color}`} /><span>{item.title}</span><strong>{item.count}</strong></div>
            <div className="overview-progress"><span className={`overview-progress-${item.color}`}
              style={{ width: `${today.total ? (item.count / today.total) * 100 : 0}%` }} /></div>
          </div>)}
        </section>
      </div>

      <section className="overview-bottom-stats" aria-label="Datos adicionales del spa">
        <div><DoorOpen size={22} /><span>Salas activas</span><strong>{stats.rooms}</strong></div>
        <div><Users size={22} /><span>Personal activo</span><strong>{stats.employees}</strong></div>
        <div><HandHeart size={22} /><span>Servicios del mes</span><strong>{stats.monthlyServicesCount}</strong></div>
        <div><Wallet size={22} /><span>Costo de servicios del mes</span><strong>{money(stats.monthlyServiceCost)}</strong></div>
        {admin && <div><PackageX size={22} /><span>Productos por reponer</span><strong>{stats.stockAlerts ?? 0}</strong></div>}
      </section>
    </>}
  </div>;
}
