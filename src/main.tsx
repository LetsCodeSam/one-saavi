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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = new URL('sw.js', import.meta.env.BASE_URL).toString();
    navigator.serviceWorker.register(url).catch(console.error);
  });
}



if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("SW registration failed:", err);
    });
  });
}