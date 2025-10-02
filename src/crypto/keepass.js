import * as kdbxweb from "kdbxweb";
export async function openKdbx(kdbxBytes, password, keyFileBytes) {
    const creds = new kdbxweb.Credentials(password ? kdbxweb.ProtectedValue.fromString(password) : null, keyFileBytes ? new Uint8Array(keyFileBytes) : null);
    return kdbxweb.Kdbx.load(kdbxBytes, creds);
}
export async function saveKdbx(db) {
    try {
        db.header.setKdf("Argon2id");
    }
    catch { }
    return db.save();
}
