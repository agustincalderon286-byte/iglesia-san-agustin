'use client';

import { useEffect, useState } from 'react';
import { trackAnalytics } from './analytics-client';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function PwaControls() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [message, setMessage] = useState('');
  const [isIos, setIsIos] = useState(false);
  const [notificationActive, setNotificationActive] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(async registration => {
        await registration.update();
        if ('PushManager' in window && 'Notification' in window && Notification.permission === 'granted') {
          setNotificationActive(Boolean(await registration.pushManager.getSubscription()));
        }
      }).catch(() => undefined);
    }
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
      if (choice.outcome === 'accepted') trackAnalytics('app_install');
      setMessage(choice.outcome === 'accepted' ? '¡Aplicación instalada!' : 'Puedes instalarla cuando quieras.');
      setInstallPrompt(null);
    } else if (isIos) {
      setMessage('En iPhone: toca Compartir y luego “Agregar a pantalla de inicio”.');
    } else {
      setMessage('Abre el menú del navegador y elige “Instalar aplicación”.');
    }
  }

  async function enableNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setMessage('Este navegador no permite notificaciones.');
      return;
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (isIos && !isStandalone) {
      setMessage('En iPhone, primero toca Compartir → “Agregar a pantalla de inicio”. Luego abre la app instalada y activa las notificaciones.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        const keyResponse = await fetch('/api/push', { cache: 'no-store' });
        if (!keyResponse.ok) throw new Error('Push is not configured');
        const { publicKey } = await keyResponse.json();
        let subscription = await registration.pushManager.getSubscription();
        subscription ??= await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const response = await fetch('/api/push', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!response.ok) throw new Error('Subscription could not be saved');
        setNotificationActive(true);
        trackAnalytics('notifications_enabled');
        await registration.showNotification('Iglesia San Agustín', {
          body: '¡Listo! Recibirás los nuevos boletines y recordatorios en este teléfono.',
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          data: { url: '/' },
        });
        setMessage('¡Notificaciones activadas en este teléfono!');
      } catch {
        setMessage('No pudimos conectar este teléfono. Inténtalo otra vez en unos minutos.');
      }
    } else {
      setMessage('No se activaron las notificaciones. Puedes cambiarlo en los ajustes del navegador.');
    }
  }

  return (
    <div className="app-actions">
      <button className="button app-button" onClick={install}>Instalar aplicación <span>↓</span></button>
      <button className="button notify-button" onClick={enableNotifications}>{notificationActive ? 'Notificaciones activadas' : 'Activar notificaciones'} <span>●</span></button>
      {message && <p className="app-message" role="status">{message}</p>}
    </div>
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
}
