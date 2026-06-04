import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// تنظيف Service Workers القديمة لحل مشكلة الكاش
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    let unregisterPromise: Promise<boolean>[] = [];
    for(let registration of registrations) {
      unregisterPromise.push(registration.unregister());
    }
    Promise.all(unregisterPromise).then(unregistered => {
      if (unregistered.some(Boolean)) {
        console.log('Old ServiceWorkers unregistered. Reloading...');
        window.location.reload();
      }
    });
  });
}

// Monkey-patch navigator.locks for iframes (GoTrue JS bug)
if (typeof navigator !== 'undefined' && 'locks' in navigator) {
  try {
    Object.defineProperty(navigator, 'locks', {
        get: () => undefined
    });
    console.log('Disabled navigator.locks to prevent Supabase GoTrue from hanging in iframe.');
  } catch (e) {
      console.warn('Could not disable navigator.locks', e);
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

