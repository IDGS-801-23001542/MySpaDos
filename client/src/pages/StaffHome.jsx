import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarCheck2, DoorOpen, HandHeart, ReceiptText, Sparkles, Users } from 'lucide-react';
import { api, dateLabel, money } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import { Alert, Empty, PageHeader, Spinner, StatusBadge } from '../components/UI.jsx';

export default function StaffHome() {
  const { identity } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api('/dashboard').then(setStats).catch((e) => setError(e.message)); }, []);

  const metrics = stats ? [
    { label: 'Clientes activos', value: stats.clients, icon: Users, tone: 'sage' },
    { label: 'Reservaciones pendientes', value: stats.pending, icon: CalendarCheck2, tone: 'sand' },
    { label: 'Salas en tu sucursal', value: stats.rooms, icon: DoorOpen, tone: 'rose' },
    { label: 'Servicios registrados', value: stats.servicesCount, icon: HandHeart, tone: 'pearl' },
  ] : [];

  return <div className="staff-view">
    <PageHeader eyebrow="PANEL DEL PERSONAL" title={`Buen día, ${identity?.profile?.name || 'equipo'}`} subtitle="Una vista tranquila de todo lo importante que sucede en tu sucursal." actions={<Link className="button button-primary" to="/personal/reservaciones">Ver reservaciones <ArrowUpRight size={17} /></Link>} />
    <div className="dashboard-welcome"><div><span className="eyebrow"><Sparkles size={13} /> TU ESPACIO DE TRABAJO</span><h2>Cuidar cada detalle también es parte del bienestar.</h2><p>Organiza la experiencia de tus clientes y mantén cada operación en orden.</p></div><HandHeart size={98} strokeWidth={0.85} /></div>
    <Alert>{error}</Alert>
    {!stats ? !error && <Spinner /> : <>
      <div className="stat-grid">{metrics.map(({ label, value, icon: Icon, tone }) => <div className={`stat-card stat-${tone}`} key={label}>
        <div className="stat-icon"><Icon size={23} strokeWidth={1.6} /></div><span>{label}</span><strong>{value}</strong>
      </div>)}</div>
      <div className="dashboard-lower"><section className="surface-card"><div className="panel-heading"><div><span className="eyebrow">MOVIMIENTOS RECIENTES</span><h2>Últimas reservaciones</h2></div><Link to="/personal/reservaciones" className="text-link">Ver todas <ArrowUpRight size={17} /></Link></div>
        {stats.recent.length ? <div className="recent-list">{stats.recent.map((r) => <div key={r.id} className="recent-item"><span className="recent-icon"><CalendarCheck2 size={20} /></span><div><strong>Reservación #{r.id}</strong><small>{r.date} · {r.start} a {r.end}</small></div><StatusBadge value={r.status} /></div>)}</div>
          : <Empty title="Sin movimientos recientes" description="Las reservaciones aparecerán aquí." />}
      </section><aside className="summary-card"><div className="summary-icon"><ReceiptText size={32} /></div><span className="eyebrow">COSTOS DE SERVICIOS</span><h2>{money(stats.revenue)}</h2><p>Valor acumulado de los servicios registrados de tu sucursal, calculado a partir de los productos utilizados.</p>
        <Link className="button button-light" to="/personal/servicios">Revisar servicios <ArrowUpRight size={17} /></Link></aside></div>
    </>}
  </div>;
}
