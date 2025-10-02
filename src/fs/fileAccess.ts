import { openDB } from "idb";

const DB = "one-saavi-handles";
const STORE = "h";

export async function saveHandle(handle: FileSystemFileHandle) {
  const db = await openDB(DB, 1, { upgrade(d){ d.createObjectStore(STORE); }});
  await db.put(STORE, handle, "vault");
}
export async function loadHandle(): Promise<FileSystemFileHandle|null> {
  const db = await openDB(DB, 1, { upgrade(d){ d.createObjectStore(STORE); }});
  return (await db.get(STORE, "vault")) ?? null;
}


export async function pickKdbx() {
  const [handle] = await (window as any).showOpenFilePicker({
    types: [{ description: "KeePass DB", accept: { "application/octet-stream": [".kdbx"] } }],
    excludeAcceptAllOption: false,
    multiple: false,
  });
  return handle as FileSystemFileHandle;
}
export async function ensurePerm(handle: FileSystemFileHandle, mode: "read" | "readwrite") {
  const res = await (handle as any).requestPermission?.({ mode });
  if (res !== "granted") throw new Error("Permission denied");
}
export async function readBytes(handle: FileSystemFileHandle) {
  const file = await handle.getFile();
  return file.arrayBuffer();
}
export async function writeBytes(handle: FileSystemFileHandle, bytes: ArrayBuffer) {
  const w = await handle.createWritable();
  await w.write(bytes);
  await w.close();
}
