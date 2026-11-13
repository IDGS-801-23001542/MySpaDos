import { useEffect, useState } from 'react';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

export function PwaStatus() {
  const online = useOnlineStatus();
  const [prompt, setPrompt] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onInstall = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('beforeinstallprompt', onInstall);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    let active = true;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (!active) return;
      if (registration.waiting) setWaiting(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const next = registration.installing;
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller && active) {
            setWaiting(next);
            setDismissed(false);
          }
        });
      });
    }).catch((error) => console.warn('PWA no disponible:', error.message));

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }

  return (
    <>
      {!online && <div className="connection-strip" role="status">
        <WifiOff size={17} /> Sin conexión: solo podrás consultar recursos públicos cargados previamente.
        Las reservaciones y cambios requieren internet.
      </div>}
      {online && waiting && !dismissed && <div className="pwa-notice" role="status">
        Hay una versión nueva de MySpa2.
        <button className="button button-primary compact" onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>
          <RefreshCw size={15} /> Actualizar
        </button>
        <button className="icon-button" aria-label="Cerrar aviso" onClick={() => setDismissed(true)}><X size={18} /></button>
      </div>}
      {online && prompt && <button className="install-app-button" onClick={install} aria-label="Instalar MySpa2">
        <Download size={16} /> Instalar app
      </button>}
    </>
  );
}
