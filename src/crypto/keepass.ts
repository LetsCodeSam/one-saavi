import * as kdbxweb from "kdbxweb";

export function addNewEntry(
  db: any,
  group: any,
  fields: { title?: string; username?: string; url?: string; password?: string; notes?: string } = {}
) {
  const g = group || db.getDefaultGroup?.() || db.groups?.[0];
  const entry = db.createEntry(g);
  entry.fields.set("Title", fields.title ?? "New Entry");
  entry.fields.set("UserName", fields.username ?? "");
  entry.fields.set("URL", fields.url ?? "");
  entry.fields.set("Password", kdbxweb.ProtectedValue.fromString(fields.password ?? ""));
  entry.fields.set("Notes", fields.notes ?? "");
  entry.times.update();
  return entry;
}




export async function openKdbx(kdbxBytes: ArrayBuffer, password: string, keyFileBytes?: ArrayBuffer) {
  const creds = new kdbxweb.Credentials(
    password ? kdbxweb.ProtectedValue.fromString(password) : null,
    keyFileBytes ? new Uint8Array(keyFileBytes) : null
  );
  return kdbxweb.Kdbx.load(kdbxBytes, creds);
}
export async function saveKdbx(db: kdbxweb.Kdbx) {
  try { db.header.setKdf("Argon2id"); } catch {}
  return db.save();
}


export async function createNewDb(password: string, name = "Saavi") {
  const creds = new kdbxweb.Credentials(
    kdbxweb.ProtectedValue.fromString(password)
  );
  const db = kdbxweb.Kdbx.create(creds, name);

  // Ensure a sensible default group exists and is named consistently
  const root = db.getDefaultGroup?.() || db.groups?.[0];
  if (root) {
    root.name = name;
    root.times?.update?.();
  }

  db.meta.generator = "One Saavi";
  db.meta.name = name;
  db.meta.historyMaxItems = 10;
  db.meta.historyMaxSize = 8 * 1024 * 1024; // 8 MB

  // touch the db so it's in a consistent initial state
  db.save();
  return db;
}