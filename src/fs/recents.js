// src/fs/recents.ts
const DB_NAME = "one-saavi-recents";
const STORE = "handles";
function openDB() {
    return new Promise((res, rej) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
}
export async function rememberHandle(handle) {
    const db = await openDB();
    await new Promise((res, rej) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(handle, "last");
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
    });
}
export async function getRememberedHandle() {
    const db = await openDB();
    return await new Promise((res, rej) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get("last");
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
    });
}
export async function clearRememberedHandle() {
    const db = await openDB();
    await new Promise((res, rej) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete("last");
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
    });
}
