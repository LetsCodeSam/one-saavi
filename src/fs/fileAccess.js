import { openDB } from "idb";
const DB = "one-saavi-handles";
const STORE = "h";
export async function saveHandle(handle) {
    const db = await openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } });
    await db.put(STORE, handle, "vault");
}
export async function loadHandle() {
    const db = await openDB(DB, 1, { upgrade(d) { d.createObjectStore(STORE); } });
    return (await db.get(STORE, "vault")) ?? null;
}
export async function pickKdbx() {
    const [handle] = await window.showOpenFilePicker({
        types: [{ description: "KeePass DB", accept: { "application/octet-stream": [".kdbx"] } }],
        excludeAcceptAllOption: false,
        multiple: false,
    });
    return handle;
}
export async function ensurePerm(handle, mode) {
    const res = await handle.requestPermission?.({ mode });
    if (res !== "granted")
        throw new Error("Permission denied");
}
export async function readBytes(handle) {
    const file = await handle.getFile();
    return file.arrayBuffer();
}
export async function writeBytes(handle, bytes) {
    const w = await handle.createWritable();
    await w.write(bytes);
    await w.close();
}
