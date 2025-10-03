let deferredPrompt: any = null;

export function setupPWAInstall(onChange: (canInstall: boolean) => void) {
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();           // keep control, show our own button
    deferredPrompt = e;
    onChange(true);
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    onChange(false);
  });
}

export async function triggerInstall(): Promise<"accepted"|"dismissed"|"unavailable"> {
  if (!deferredPrompt) return "unavailable";
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice; // "accepted" | "dismissed"
  deferredPrompt = null;
  return outcome;
}
