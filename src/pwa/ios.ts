// src/pwa/ios.ts
export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
// Safari sets navigator.standalone = true when launched from Home Screen
export function isStandaloneIOS() {
  return (navigator as any).standalone === true;
}
