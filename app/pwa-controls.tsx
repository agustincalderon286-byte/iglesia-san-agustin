'use client';

import { useEffect, useState } from 'react';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState('');
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setMessage(choice.outcome === 'accepted' ? '¡Aplicación instalada!' : 'Puedes instalarla cuando quieras.');
      setInstallPrompt(null);
    } else if (isIos) {
      setMessage('En iPhone: toca Compartir y luego “Agregar a pantalla de inicio”.');
    } else {
      setMessage('Abre el menú del navegador y elige “Instalar aplicación”.');
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window)) {
      setMessage('Este navegador no permite notificaciones.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Iglesia San Agustín', {
        body: '¡Listo! Las notificaciones están activadas en este teléfono.',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
      });
      setMessage('¡Notificaciones activadas!');
    } else {
      setMessage('No se activaron las notificaciones. Puedes cambiarlo en los ajustes del navegador.');
    }
  }

  return (
    <div className="app-actions">
      <button className="button app-button" onClick={install}>Instalar aplicación <span>↓</span></button>
      <button className="button notify-button" onClick={enableNotifications}>Activar notificaciones <span>●</span></button>
      {message && <p className="app-message" role="status">{message}</p>}
    </div>
  );
}
