import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export const useTrafficTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        // Prevent tracking the same session continuously across page navigations in a short time
        const lastTracked = sessionStorage.getItem('last_traffic_tracked');
        const now = Date.now();
        if (lastTracked && now - parseInt(lastTracked) < 1000 * 60 * 30) {
          // If tracked in the last 30 minutes, skip
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const data = {
          referrer: document.referrer,
          path: location.pathname,
          utmSource: params.get('utm_source'),
          utmMedium: params.get('utm_medium'),
          utmCampaign: params.get('utm_campaign'),
          device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        };

        // Fallback for custom 'ref' param if utm_source is missing
        if (!data.utmSource && params.get('ref')) {
          data.utmSource = params.get('ref');
        }

        await api.post('/analytics/track', data);
        sessionStorage.setItem('last_traffic_tracked', now.toString());
      } catch (error) {
        console.error('Failed to track traffic:', error);
      }
    };

    trackVisit();
  }, [location.pathname]);
};

export default useTrafficTracker;
