// File: src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// src/main.tsx (bottom)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const url = new URL('sw.js', import.meta.env.BASE_URL).toString();
    navigator.serviceWorker.register(url).catch(console.error);
  });
}

