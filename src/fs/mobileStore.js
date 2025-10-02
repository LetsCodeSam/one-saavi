import { openDB } from "idb";
const DB_NAME = "one-saavi-local";
const STORE = "vault";
async function db() {
    return openDB(DB_NAME, 1, {
        upgrade(d) {
            d.createObjectStore(STORE);
        },
    });
}
// Save encrypted bytes (ArrayBuffer) and a display name
export async function saveVaultBytes(bytes, name) {
    const d = await db();
    // Store as Uint8Array for IDB
    await d.put(STORE, new Uint8Array(bytes), "bytes");
    await d.put(STORE, name, "name");
}
// Load encrypted bytes and name
export async function loadVaultBytes() {
    const d = await db();
    const arr = (await d.get(STORE, "bytes"));
    const name = (await d.get(STORE, "name"));
    if (!arr)
        return { bytes: null, name: name ?? null };
    // Reconstitute into a real ArrayBuffer (not ArrayBufferLike)
    const out = new ArrayBuffer(arr.byteLength);
    new Uint8Array(out).set(arr);
    return { bytes: out, name: name ?? null };
}
