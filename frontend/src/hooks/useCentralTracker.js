import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

// Central & Local Analytics endpoints
const CENTRAL_API_URL = process.env.REACT_APP_CENTRAL_ANALYTICS_URL || 'https://api.graxion.in/api/analytics/track';
const LOCAL_API_URL = '/api/public/track';

export const useCentralTracker = (appName = 'flow') => {
  const location = useLocation();
  const lastPathRef = useRef(null);

  useEffect(() => {
    // Avoid redundant firing on identical path re-renders
    if (lastPathRef.current === location.pathname) {
      return;
    }
    lastPathRef.current = location.pathname;

    const trackVisit = async () => {
      try {
        const storageKey = `last_traffic_tracked_${appName}`;
        const lastTracked = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
        const now = Date.now();
        if (lastTracked && now - parseInt(lastTracked, 10) < 1000 * 60 * 30) {
          return;
        }

        const params = new URLSearchParams(window.location.search || '');
        const data = {
          referrer: document.referrer || '',
          path: location.pathname || '/',
          utmSource: params.get('utm_source') || params.get('ref') || '',
          utmMedium: params.get('utm_medium') || '',
          utmCampaign: params.get('utm_campaign') || '',
          device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          app: appName,
          timestamp: now
        };

        // Mark session storage immediately to throttle requests
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(storageKey, now.toString());
        }

        // 1. Send to local backend tracking endpoint (reliable and CORS-free)
        try {
          await axios.post(LOCAL_API_URL, data, { timeout: 3000 });
        } catch {
          // Graceful fallback if backend is warming up
        }

        // 2. Best-effort dispatch to central tracker if on graxion domain or custom central URL configured
        if (process.env.REACT_APP_CENTRAL_ANALYTICS_URL || (typeof window !== 'undefined' && window.location.hostname.endsWith('graxion.in'))) {
          try {
            if (navigator.sendBeacon) {
              const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
              navigator.sendBeacon(CENTRAL_API_URL, blob);
            } else {
              axios.post(CENTRAL_API_URL, data, { timeout: 3000 }).catch(() => {});
            }
          } catch {
            // Analytics failures must never raise console errors
          }
        }
      } catch (err) {
        // Suppress analytics errors to avoid impacting UI or error reporting
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Analytics] Traffic tracking skipped:', err?.message || err);
        }
      }
    };

    trackVisit();
  }, [location.pathname, appName]);
};

export default useCentralTracker;
