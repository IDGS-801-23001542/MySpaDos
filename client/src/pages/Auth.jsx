import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, Mail, Sparkles, Sun } from 'lucide-react';
import { api } from '../lib.js';
import { useAuth } from '../hooks/useAuth.js';
import { Alert, Brand, Field, PrimaryButton } from '../components/UI.jsx';

const genders = [['MASCULINO', 'Masculino'], ['FEMENINO', 'Femenino'], ['OTRO', 'Otro']];

function AuthFrame({ eyebrow, title, subtitle, children, centered = false }) {
  return <div className={`auth-layout ${centered ? 'auth-layout-centered' : ''}`}><div className="auth-deco"><div className="auth-deco-icon"><Sun size={72} strokeWidth={0.8} /></div>
    <span className="eyebrow">UN MOMENTO PARA TI</span><h2>El bienestar comienza con <em>una pausa.</em></h2><p>Descubre un lugar más sereno para cuidar de ti.</p>
  </div><div className="auth-card"><div className="auth-brand"><Brand symbolOnly /></div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}</div></div>;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await login(form);
      navigate(['ADMIN', 'EMPLEADO'].includes(result.user.role) ? '/personal' : '/mis-reservaciones', { replace: true });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <AuthFrame eyebrow="QUÉ GUSTO VERTE" title="Bienvenido de nuevo" subtitle="Accede con tu usuario o correo electrónico.">
    <form className="form-stack" onSubmit={submit}><Alert>{error}</Alert>
      <Field label="Usuario o correo"><input required autoComplete="username" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="Tu usuario" /></Field>
      <Field label="Contraseña"><input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Tu contraseña" /></Field>
      <div className="form-end"><Link to="/recuperar">¿Olvidaste tu contraseña?</Link></div>
      <PrimaryButton type="submit" busy={busy}>Iniciar sesión</PrimaryButton>
    </form><p className="auth-switch">¿Todavía no tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
  </AuthFrame>;
}

const blank = { name: '', lastName: '', secondLastName: '', gender: 'FEMENINO', rfc: '', address: '', phone: '', email: '', username: '', password: '' };

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const edit = (key) => (event) => setForm((state) => ({ ...state, [key]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await register(form); navigate('/mis-reservaciones', { replace: true }); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <AuthFrame centered eyebrow="TU BIENESTAR EMPIEZA AQUÍ" title="Crea tu espacio" subtitle="Regístrate para reservar nuestras salas de spa.">
    <form className="form-grid" onSubmit={submit}><div className="field-full"><Alert>{error}</Alert><div className="form-subheading"><h2>Datos personales</h2><p>Los campos con * son obligatorios.</p></div></div>
      <Field label="Nombre *"><input required minLength={2} value={form.name} onChange={edit('name')} /></Field>
      <Field label="Apellido paterno *"><input required minLength={2} value={form.lastName} onChange={edit('lastName')} /></Field>
      <Field label="Apellido materno"><input value={form.secondLastName} onChange={edit('secondLastName')} /></Field>
      <Field label="Género"><select value={form.gender} onChange={edit('gender')}>{genders.map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
      <Field label="RFC (opcional)"><input value={form.rfc} onChange={edit('rfc')} maxLength={13} placeholder="Si cuentas con él" /></Field>
      <Field label="Teléfono"><input type="tel" value={form.phone} onChange={edit('phone')} /></Field>
      <Field label="Domicilio" full><input value={form.address} onChange={edit('address')} /></Field>
      <div className="field-full form-subheading"><h2>Datos de acceso</h2><p>Los utilizarás para ingresar a MySpa2.</p></div>
      <Field label="Correo electrónico *" full><input type="email" required value={form.email} onChange={edit('email')} /></Field>
      <Field label="Nombre de usuario *"><input required minLength={4} value={form.username} onChange={edit('username')} /></Field>
      <Field label="Contraseña *" hint="10+ caracteres, mayúscula, minúscula y número"><input required type="password" minLength={10} autoComplete="new-password" value={form.password} onChange={edit('password')} /></Field>
      <div className="field-full"><PrimaryButton type="submit" busy={busy}>Crear mi cuenta</PrimaryButton></div>
    </form><p className="auth-switch">¿Ya tienes cuenta? <Link to="/acceso">Inicia sesión</Link></p>
  </AuthFrame>;
}

export function ForgotPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const result = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      if (result.smtpConfigured) {
        setMessage(result.message);
      } else {
        setMessage('');
        setError('La recuperación no está disponible. Pide al administrador revisar SMTP y el secreto de recuperación en el servidor.');
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <AuthFrame eyebrow="RECUPERA TU ACCESO" title="Volvamos a encontrarnos" subtitle="Te enviaremos un enlace seguro para restablecer tu contraseña.">
    <form className="form-stack" onSubmit={submit}><Alert>{error}</Alert>{message && <Alert type="success">{message}</Alert>}
      <Field label="Correo registrado"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <PrimaryButton type="submit" busy={busy}><Mail size={18} /> Enviar instrucciones</PrimaryButton>
    </form><p className="auth-switch"><Link to="/acceso"><ArrowLeft size={15} /> Volver al inicio de sesión</Link></p>
  </AuthFrame>;
}

export function ResetPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    setBusy(true);
    try {
      const result = await api('/auth/reset-password', { method: 'POST', body: { token, password } });
      setSuccess(result.message);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <AuthFrame eyebrow="UNA NUEVA ETAPA" title="Nueva contraseña" subtitle="Elige una contraseña segura para tu cuenta.">
    <form className="form-stack" onSubmit={submit}><Alert>{error}</Alert>{success && <Alert type="success">{success} <Link to="/acceso">Inicia sesión</Link></Alert>}
      <Field label="Nueva contraseña"><input type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Field label="Confirmar contraseña"><input type="password" required minLength={10} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
      <PrimaryButton busy={busy} type="submit"><LockKeyhole size={17} /> Guardar contraseña</PrimaryButton>
    </form>
  </AuthFrame>;
}
