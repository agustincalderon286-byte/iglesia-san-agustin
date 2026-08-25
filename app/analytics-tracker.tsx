'use client';

import { useEffect } from 'react';
import { trackAnalytics } from './analytics-client';

export default function AnalyticsTracker() {
  useEffect(() => {
    trackAnalytics('page_view');
    const trackClick = (event: MouseEvent) => {
      const element = (event.target as Element | null)?.closest<HTMLElement>('[data-track]');
      if (!element?.dataset.track) return;
      trackAnalytics(element.dataset.track, element.dataset.trackLabel ? { label: element.dataset.trackLabel } : {});
    };
    document.addEventListener('click', trackClick);
    return () => document.removeEventListener('click', trackClick);
  }, []);

  return null;
}
