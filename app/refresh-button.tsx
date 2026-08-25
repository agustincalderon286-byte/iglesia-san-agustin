'use client';

import { useState } from 'react';
import { trackAnalytics } from './analytics-client';

export default function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  async function refreshApp() {
    if (refreshing) return;
    setRefreshing(true);
    trackAnalytics('manual_refresh');
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      }
    } finally {
      window.location.reload();
    }
  }

  return <button className="refresh-button" type="button" onClick={refreshApp} aria-label="Actualizar la aplicación">
    <span aria-hidden="true">↻</span><b>{refreshing ? 'Actualizando…' : 'Actualizar'}</b>
  </button>;
}
