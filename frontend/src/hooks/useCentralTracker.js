import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

// Central Graxion Analytics API
const CENTRAL_API_URL = 'https://api.graxion.in/api/analytics/track';

export const useCentralTracker = (appName = 'flow') => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        const lastTracked = sessionStorage.getItem(`last_traffic_tracked_${appName}`);
        const now = Date.now();
        if (lastTracked && now - parseInt(lastTracked) < 1000 * 60 * 30) return;

        const params = new URLSearchParams(window.location.search);
        const data = {
          referrer: document.referrer,
          path: location.pathname,
          utmSource: params.get('utm_source'),
          utmMedium: params.get('utm_medium'),
          utmCampaign: params.get('utm_campaign'),
          device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          app: appName
        };

        if (!data.utmSource && params.get('ref')) {
          data.utmSource = params.get('ref');
        }

        // Send to Central Analytics Server
        await axios.post(CENTRAL_API_URL, data);
        sessionStorage.setItem(`last_traffic_tracked_${appName}`, now.toString());
      } catch (error) {
        console.error('Failed to track traffic:', error);
      }
    };

    trackVisit();
  }, [location.pathname, appName]);
};

export default useCentralTracker;
