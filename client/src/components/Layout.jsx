import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays, ClipboardList, DoorOpen, Flower2, Home, Leaf, LayoutDashboard,
  LogIn, LogOut, Menu, Package, Scissors, Settings2, Sparkles, UserRound,
  Users, X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { Brand } from './UI.jsx';
import { PwaStatus } from './PwaStatus.jsx';

const adminLinks = [
  { label: 'Vista general', to: '/personal', icon: LayoutDashboard },
  { label: 'Reservaciones', to: '/personal/reservaciones', icon: CalendarDays },
  { label: 'Servicios', to: '/personal/servicios', icon: ClipboardList },
  { label: 'Empleados y administradores', to: '/personal/empleados', icon: Users },
  { label: 'Clientes', to: '/personal/clientes', icon: UserRound },
  { label: 'Sucursales', to: '/personal/sucursales', icon: Home },
  { label: 'Salas', to: '/personal/salas', icon: DoorOpen },
  { label: 'Horarios', to: '/personal/horarios', icon: CalendarDays },
  { label: 'Tratamientos', to: '/personal/tratamientos', icon: Scissors },
  { label: 'Productos e inventario', to: '/personal/productos', icon: Package },
  { label: 'Mi perfil', to: '/personal/mi-perfil', icon: Settings2 },
];
const employeeLinks = [
  { label: 'Vista general', to: '/personal', icon: LayoutDashboard },
  { label: 'Reservaciones', to: '/personal/reservaciones', icon: CalendarDays },
  { label: 'Servicios', to: '/personal/servicios', icon: ClipboardList },
  { label: 'Mi perfil', to: '/personal/mi-perfil', icon: Settings2 },
];
const clientLinks = [
  { label: 'Explorar salas', to: '/salas', icon: DoorOpen },
  { label: 'Mis reservaciones e historial', to: '/mis-reservaciones', icon: CalendarDays },
  { label: 'Mi perfil', to: '/mi-perfil', icon: Settings2 },
];
const guestLinks = [
  { label: 'Inicio', to: '/', icon: Home },
  { label: 'Experiencias', to: '/salas', icon: DoorOpen },
  { label: 'Iniciar sesión', to: '/acceso', icon: LogIn },
  { label: 'Crear cuenta', to: '/registro', icon: UserRound },
];

export function Layout() {
  const { identity, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousScroll = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();
  const role = identity?.user?.role;
  const isStaff = role === 'ADMIN' || role === 'EMPLEADO';
  const links = role === 'ADMIN' ? adminLinks : role === 'EMPLEADO' ? employeeLinks
    : role === 'CLIENTE' ? clientLinks : guestLinks;

  useEffect(() => {
    setMenuOpen(false);
    setHeaderVisible(true);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleScroll() {
      const position = Math.max(0, window.scrollY);
      const movement = position - previousScroll.current;
      if (menuOpen || position < 90) setHeaderVisible(true);
      else if (Math.abs(movement) > 5) setHeaderVisible(movement < 0);
      previousScroll.current = position;
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const former = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    function escape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = former;
      document.removeEventListener('keydown', escape);
    };
  }, [menuOpen]);

  async function signOut() {
    try {
      await logout();
      setMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('No se pudo cerrar la sesión:', error);
    }
  }

  return (
    <div className="app-shell">
      <PwaStatus />
      <div className="top-announcement">
        <Sparkles size={13} /> Un espacio para reconectar contigo <Sparkles size={13} />
      </div>
      <header className={`site-header myspa-header ${headerVisible ? '' : 'myspa-header-hidden'}`}>
        <div className="myspa-header-left">
          <button
            ref={menuButtonRef}
            className="icon-button myspa-menu-trigger classic-menu"
            type="button"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
            aria-controls="app-drawer"
            onClick={() => setMenuOpen(true)}
          ><Menu size={24} strokeWidth={2} /></button>
        </div>
        <Link className="brand-link myspa-header-brand" to="/" aria-label="MySpa2, ir a Inicio">
          <Brand />
        </Link>
        <nav className="header-links myspa-header-links" aria-label="Navegación principal">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/salas">Experiencias</NavLink>
          {identity && <NavLink to={isStaff ? '/personal' : '/mis-reservaciones'}>
            {isStaff ? 'Panel del personal' : 'Mi espacio'}
          </NavLink>}
        </nav>
      </header>
      <div className="body-shell"><main className="main-content" id="contenido"><Outlet /></main></div>
      <div className={`drawer-backdrop ${menuOpen ? 'visible' : ''}`} aria-hidden="true">
        <button type="button" tabIndex={menuOpen ? 0 : -1}
          aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />
      </div>
      <aside id="app-drawer" className={`sidebar myspa-drawer ${menuOpen ? 'sidebar-open' : ''}`}
        aria-label="Menú lateral" aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="sidebar-top">
          <span className="sidebar-kicker">{isStaff ? 'ESPACIO DEL PERSONAL' : role === 'CLIENTE' ? 'TU ESPACIO' : 'BIENVENIDO'}</span>
          <button ref={closeButtonRef} className="icon-button" type="button"
            aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}><X size={21} /></button>
        </div>
        {identity ? <div className="sidebar-person">
          <div className="person-avatar">{identity.profile?.photoUrl
            ? <img src={identity.profile.photoUrl} alt="Foto de perfil" /> : <Flower2 size={23} />}</div>
          <div><strong>{identity.profile?.name || identity.user.username}</strong>
            <small>{role === 'ADMIN' ? 'Administración' : isStaff
              ? identity.profile?.position || 'Personal MySpa2' : 'Cliente MySpa2'}</small></div>
        </div> : <div className="drawer-welcome"><Brand compact /><p>Bienestar a tu ritmo.</p></div>}
        <nav className="sidebar-nav" aria-label="Secciones">
          {links.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to}
            end={to === '/personal' || to === '/'}
            className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
            onClick={() => setMenuOpen(false)}><Icon size={18} />{label}</NavLink>)}
        </nav>
        <div className="myspa-drawer-footer">
          {identity && <button type="button" className="myspa-logout" onClick={signOut}>
            <LogOut size={18} /> Cerrar sesión
          </button>}
          <span><Leaf size={16} /> Una pausa para ti</span>
        </div>
      </aside>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} MySpa2</span>
        <span>Calma · Equilibrio · Bienestar</span>
      </footer>
    </div>
  );
}
