import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Assuming a global CSS file for styles like TailwindCSS is present.
// If not, this import can be removed.
// import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
