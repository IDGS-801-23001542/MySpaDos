import { AlertCircle, Check, ChevronRight, Compass, LoaderCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { pretty } from '../lib.js';
import BrandFlower from './BrandFlower.jsx';

export function Brand({ compact = false, symbolOnly = false, label = 'MySpa2' }) {
  return (
    <div className={`brand ${compact ? 'brand-small' : ''} ${symbolOnly ? 'brand-symbol-only' : ''}`} aria-label={label}>
      <span className="brand-symbol"><BrandFlower size={compact ? 30 : 35} /></span>
      {!symbolOnly && <span className="brand-copy"><strong>MySpa<span>2</span></strong>{!compact && <small>SPA · RITUALES DE BIENESTAR</small>}</span>}
    </div>
  );
}

export function StatusBadge({ value }) {
  const word = String(value || 'SIN ESTADO').toUpperCase();
  const variant = ({
    ACTIVO: 'success', ATENDIDA: 'success', DISPONIBLE: 'success',
    PENDIENTE: 'warning', INACTIVO: 'neutral',
    CANCELADA: 'danger', NO_ASISTIO: 'danger', VENCIDA: 'danger', ERROR: 'danger',
  })[word] || 'neutral';
  return <span className={`status status-${variant}`}><span className="status-dot" />{word === 'NO_ASISTIO' ? 'No asistió' : pretty(word)}</span>;
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Empty({ icon: Icon = Compass, title = 'Todavía no hay registros', description }) {
  return (
    <div className="empty-state">
      <span className="empty-symbol"><Icon size={30} strokeWidth={1.5} /></span>
      <h3>{title}</h3>{description && <p>{description}</p>}
    </div>
  );
}

export function Spinner({ text = 'Cargando información...' }) {
  return <div className="loading"><LoaderCircle className="spin" size={24} />{text}</div>;
}

export function Alert({ children, type = 'error' }) {
  if (!children) return null;
  return <div className={`alert alert-${type}`} role={type === 'success' ? 'status' : 'alert'}><AlertCircle size={18} />{children}</div>;
}

export function Modal({ title, subtitle, children, onClose, wide = false }) {
  useEffect(() => {
    const handle = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  return (
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <div className="modal-heading"><div className="modal-brand"><Brand compact /></div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function PrimaryButton({ children, busy, ...props }) {
  return (
    <button className="button button-primary" {...props} disabled={busy || props.disabled}>
      {busy ? <LoaderCircle size={18} className="spin" /> : null}{children}
      {!busy && <ChevronRight size={17} />}
    </button>
  );
}

export function Field({ label, hint, children, full = false }) {
  return (
    <label className={`field ${full ? 'field-full' : ''}`}>
      <span className="field-label">{label}</span>{children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, 4000);
    return () => clearTimeout(id);
  }, [message, onDismiss]);
  return message && <div className="toast"><Check size={19} />{message}<button onClick={onDismiss} aria-label="Cerrar"><X size={16} /></button></div>;
}
