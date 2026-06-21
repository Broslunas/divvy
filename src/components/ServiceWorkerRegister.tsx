'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const register = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          })
          .catch((err) => {
            console.error('ServiceWorker registration failed: ', err);
          });
      };

      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        register();
      } else {
        window.addEventListener('load', register);
        return () => window.removeEventListener('load', register);
      }
    }
  }, []);

  return null;
}
