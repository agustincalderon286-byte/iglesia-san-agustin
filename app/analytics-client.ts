'use client';

const VISITOR_KEY = 'san-agustin-visitor-id';

function visitorId() {
  try {
    let value = localStorage.getItem(VISITOR_KEY);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, value);
    }
    return value;
  } catch {
    return '';
  }
}

export function trackAnalytics(event: string, metadata: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify({ event, visitor_id: visitorId(), metadata });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
      return;
    }
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Las estadísticas nunca deben interrumpir la experiencia de la página.
  }
}
