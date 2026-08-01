/**
 * Dynamic script loader utility for lazy loading third-party SDKs
 */

export const loadScript = (url, id) => {
  return new Promise((resolve, reject) => {
    // If script already exists in document
    const existingScript = document.getElementById(id);
    if (existingScript) {
      // Check if it's already finished loading
      if (window[id + '_loaded'] || (id === 'facebook-jssdk' && window.FB) || (id === 'razorpay-checkout-script' && window.Razorpay) || (id === 'zoom-embedded' && window.ZoomMtgEmbedded)) {
        resolve();
        return;
      }
      // If script is added but not loaded yet, poll briefly
      const interval = setInterval(() => {
        if ((id === 'facebook-jssdk' && window.FB) || (id === 'razorpay-checkout-script' && window.Razorpay) || (id === 'zoom-embedded' && window.ZoomMtgEmbedded)) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(); // resolve anyway
      }, 5000);
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.id = id;
    script.async = true;
    
    script.onload = () => {
      window[id + '_loaded'] = true;
      resolve();
    };
    
    script.onerror = (err) => {
      reject(new Error(`Failed to load script: ${url}`));
    };
    
    document.head.appendChild(script);
  });
};

/**
 * Loads Facebook SDK dynamically
 */
export const loadFbSdk = () => {
  return new Promise((resolve, reject) => {
    let META_APP_ID = process.env.REACT_APP_META_APP_ID || "928669669524481";
    let META_API_VERSION = process.env.REACT_APP_META_API_VERSION || "v21.0";
    
    // Ensure version starts with 'v' to prevent "init not called with valid version" error
    META_API_VERSION = META_API_VERSION.trim();
    if (!META_API_VERSION.startsWith('v')) {
      META_API_VERSION = `v${META_API_VERSION}`;
    }
    if (META_API_VERSION === 'v') META_API_VERSION = 'v21.0';

    const initFB = () => {
      if (!window.fbInitialized) {
        window.FB.init({
          appId            : META_APP_ID,
          cookie           : true,
          xfbml            : true,
          version          : META_API_VERSION
        });
        window.fbInitialized = true;
      }
      resolve(window.FB);
    };

    if (window.FB) {
      // If FB stub is already loaded (e.g. by Pixel), initialize and resolve
      initFB();
      return;
    }

    window.fbAsyncInit = initFB;

    loadScript('https://connect.facebook.net/en_US/sdk.js', 'facebook-jssdk')
      .catch(err => {
        console.error('FB SDK Load error:', err);
        reject(err);
      });
  });
};

/**
 * Loads Zoom Meeting SDK Component View CDN scripts sequentially on demand
 */
export const loadZoomSdk = async () => {
  if (window.ZoomMtgEmbedded) return window.ZoomMtgEmbedded;

  try {
    // Zoom Embedded Component View scripts must load sequentially
    await loadScript('https://source.zoom.us/3.9.2/lib/vendor/lodash.min.js', 'zoom-lodash');
    await loadScript('https://source.zoom.us/3.9.2/lib/vendor/redux.min.js', 'zoom-redux');
    await loadScript('https://source.zoom.us/3.9.2/lib/vendor/redux-thunk.min.js', 'zoom-redux-thunk');
    await loadScript('https://source.zoom.us/3.9.2/lib/vendor/react.min.js', 'zoom-react');
    await loadScript('https://source.zoom.us/3.9.2/lib/vendor/react-dom.min.js', 'zoom-react-dom');
    await loadScript('https://source.zoom.us/zoom-meeting-embedded-3.9.2.min.js', 'zoom-embedded');
    return window.ZoomMtgEmbedded;
  } catch (err) {
    console.error('Failed to dynamically load Zoom Meeting SDK:', err);
    throw err;
  }
};
