import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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

// Clear any corrupted supabase caches globally
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') && key.includes('lock'))) {
      localStorage.removeItem(key);
    }
  }
} catch (e) {}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

