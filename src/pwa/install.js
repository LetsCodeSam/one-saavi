let deferredPrompt = null;
export function setupPWAInstall(onChange) {
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault(); // keep control, show our own button
        deferredPrompt = e;
        onChange(true);
    });
    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        onChange(false);
    });
}
export async function triggerInstall() {
    if (!deferredPrompt)
        return "unavailable";
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice; // "accepted" | "dismissed"
    deferredPrompt = null;
    return outcome;
}
