import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, Compass, History, KeyRound, TicketCheck, UserRound } from 'lucide-react';
import { api, dateLabel, money, shortDate } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import { ImageUpload } from '../components/ImageUpload.jsx';
import { ProfileAvatar } from '../components/ProfileAvatar.jsx';
import { Alert, Empty, Field, PageHeader, PrimaryButton, StatusBadge } from '../components/UI.jsx';

const sections = {
  bookings: [
    ['reservas', CalendarDays, 'Próximas y anteriores'],
    ['historial', History, 'Historial de servicios'],
  ],
  profile: [
    ['perfil', UserRound, 'Mis datos'],
    ['clave', KeyRound, 'Contraseña'],
  ],
};

export default function AccountPage({ mode = 'bookings' }) {
  const { identity, refresh } = useAuth();
  const isStaff = identity?.user?.role !== 'CLIENTE';
  const [tab, setTab] = useState(mode === 'profile' ? 'perfil' : 'reservas');
  const [reservations, setReservations] = useState([]);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState({});
  const [passwords, setPasswords] = useState({ current: '', password: '' });

  useEffect(() => {
    setTab(mode === 'profile' ? 'perfil' : 'reservas');
    setError('');
    setMessage('');
  }, [mode]);

  useEffect(() => { setProfile(identity?.profile || {}); }, [identity]);
  useEffect(() => {
    if (mode !== 'bookings') return;
    api('/reservations').then(setReservations).catch((failure) => setError(failure.message));
    api('/services').then(setServices).catch((failure) => setError(failure.message));
  }, [mode]);

  const fullname = [identity?.profile?.name, identity?.profile?.lastName].filter(Boolean).join(' ');

  async function cancelBooking(id) {
    if (!window.confirm('¿Cancelar esta reservación?')) return;
    setBusy(true);
    setError('');
    try {
      await api(`/reservations/${id}/cancel`, { method: 'POST' });
      setReservations(await api('/reservations'));
      setMessage('Reservación cancelada correctamente.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/profile', {
        method: 'PATCH',
        body: {
          name: profile.name,
          lastName: profile.lastName,
          secondLastName: profile.secondLastName || '',
          address: profile.address || '',
          phone: profile.phone || '',
          gender: profile.gender || 'OTRO',
          rfc: profile.rfc || '',
          email: profile.email,
          username: profile.username,
          photoUrl: profile.photoUrl || '',
        },
      });
      await refresh();
      setMessage('Tu perfil se actualizó correctamente.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/auth/change-password', { method: 'POST', body: passwords });
      window.location.assign('/acceso');
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  }

  return (
    <div className="container view-page account-page">
      <PageHeader
        eyebrow={mode === 'bookings' ? 'TU HISTORIAL DE BIENESTAR' : 'CONFIGURACIÓN PERSONAL'}
        title={mode === 'bookings' ? 'Mis reservaciones' : 'Mi perfil'}
        subtitle={mode === 'bookings'
          ? 'Consulta y cancela tus reservaciones. Revisa también los tratamientos que has recibido.'
          : 'Actualiza tus datos, tu fotografía y la contraseña de acceso.'}
      />

      <div className="account-hello">
        <ProfileAvatar
          className="account-avatar"
          photoUrl={profile.photoUrl}
          name={fullname || identity?.user?.username || 'usuario'}
          iconSize={37}
        />
        <div>
          <h3>{fullname || identity?.user?.username}</h3>
          <p>{isStaff
            ? `${identity?.user?.role === 'ADMIN' ? 'Administrador' : 'Empleado'} · ${identity?.profile?.position || 'MySpa2'}`
            : `Cliente MySpa2 · ${identity?.profile?.clientNumber || ''}`}</p>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label={mode === 'bookings' ? 'Reservaciones e historial' : 'Datos personales y acceso'}>
        {sections[mode].map(([key, Icon, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'tab active' : 'tab'}
            onClick={() => { setTab(key); setError(''); setMessage(''); }}
          >
            <Icon size={17} /> {label}
          </button>
        ))}
      </div>
      <Alert>{error}</Alert>
      {message && <Alert type="success">{message}</Alert>}

      {mode === 'bookings' && tab === 'reservas' && (
        <div className="reservation-list">
          {reservations.length ? reservations.map((item) => (
            <article className="reservation-card" key={item.id}>
              <div className="reservation-icon"><TicketCheck size={25} strokeWidth={1.55} /></div>
              <div className="reservation-main">
                <div className="reservation-heading"><h3>{item.roomName}</h3><StatusBadge value={item.status} /></div>
                <p>{item.branchName}</p>
                {item.guests?.length > 0 && <div className="guest-prefs-note">
                  {item.guests.map((guest, index) => (
                    <div key={index}><strong>{index === 0 ? 'Titular' : 'Acompañante'}:</strong> {guest.name}
                      {guest.treatmentIds?.length ? ` · ${guest.treatmentIds.length} tratamiento(s) solicitado(s)` : ''}
                    </div>
                  ))}
                </div>}
                <div className="reservation-meta">
                  <span><CalendarDays size={16} /> {shortDate(item.date)}</span>
                  <span><Clock3 size={16} /> {item.scheduleText} · {item.partySize || 1} persona(s)</span>
                </div>
              </div>
              {item.status === 'PENDIENTE' && (
                <button className="button button-danger-outline" disabled={busy} onClick={() => cancelBooking(item.id)}>
                  Cancelar
                </button>
              )}
            </article>
          )) : (
            <Empty icon={Compass} title="Aún no tienes reservaciones" description="Explora nuestras salas y reserva tu primer momento de calma." />
          )}
        </div>
      )}

      {mode === 'bookings' && tab === 'historial' && (
        <div className="service-history">
          {services.length ? services.map((service) => (
            <article className="surface-card" key={service.id}>
              <div className="service-title-row">
                <div>
                  <span className="eyebrow">SERVICIO #{service.id}</span>
                  <h3>{service.roomName}</h3>
                  <p>{dateLabel(service.dateTime)} · {service.employeeName}</p>
                </div>
                <strong>{money(service.totalCost)}</strong>
              </div>
              {service.treatments.map((line, index) => (
                <div key={index} className="service-line">
                  <strong>{line.guestName ? `${line.guestName} · ` : ''}{line.name}</strong><span>{money(line.totalCost)}</span>
                  <ul>{line.products.map((product, j) => (
                    <li key={j}>{product.name} · {product.quantity} × {money(product.unitCost)} = {money(product.totalCost)}</li>
                  ))}</ul>
                </div>
              ))}
            </article>
          )) : (
            <Empty title="Todavía no has recibido servicios" description="Cuando completes una experiencia podrás consultar sus tratamientos y costos." />
          )}
        </div>
      )}

      {mode === 'profile' && tab === 'perfil' && (
        <form className="surface-card form-grid" onSubmit={saveProfile}>
          <div className="field-full">
            <Field label="Mi fotografía" hint="Puedes agregar o cambiar tu foto de perfil.">
              <ImageUpload
                value={profile.photoUrl || ''}
                onChange={(photoUrl) => setProfile((old) => ({ ...old, photoUrl }))}
                label="Elegir fotografía"
              />
            </Field>
          </div>
          <Field label="Nombre"><input required value={profile.name || ''} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
          <Field label="Apellido paterno"><input required value={profile.lastName || ''} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} /></Field>
          <Field label="Apellido materno"><input value={profile.secondLastName || ''} onChange={(e) => setProfile({ ...profile, secondLastName: e.target.value })} /></Field>
          <Field label="Teléfono"><input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
          <Field label="Domicilio" full><input value={profile.address || ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Field>
          <Field label="Género">
            <select value={profile.gender || 'OTRO'} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
              <option value="FEMENINO">Femenino</option>
              <option value="MASCULINO">Masculino</option>
              <option value="OTRO">Otro</option>
            </select>
          </Field>
          <Field label="RFC (opcional para clientes)">
            <input value={profile.rfc || ''} onChange={(e) => setProfile({ ...profile, rfc: e.target.value })} />
          </Field>
          <Field label="Correo"><input required type="email" value={profile.email || ''} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
          <Field label="Nombre de usuario"><input required minLength={4} value={profile.username || ''} onChange={(e) => setProfile({ ...profile, username: e.target.value })} /></Field>
          <div className="field-full"><PrimaryButton type="submit" busy={busy}>Guardar mis cambios</PrimaryButton></div>
        </form>
      )}

      {mode === 'profile' && tab === 'clave' && (
        <form className="surface-card form-stack narrow-form" onSubmit={changePassword}>
          <Field label="Contraseña actual">
            <input type="password" required autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
          </Field>
          <Field label="Contraseña nueva" hint="Al menos 10 caracteres, mayúscula, minúscula y número">
            <input type="password" minLength={10} required autoComplete="new-password" value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} />
          </Field>
          <PrimaryButton busy={busy} type="submit">Cambiar contraseña</PrimaryButton>
        </form>
      )}
    </div>
  );
}
