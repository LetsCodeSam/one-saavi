import * as kdbxweb from 'kdbxweb';
self.onmessage = async (e) => {
    const { cmd, kdbxBytes, password, keyFileBytes } = e.data;
    try {
        if (cmd === 'open') {
            const creds = new kdbxweb.Credentials(password ? kdbxweb.ProtectedValue.fromString(password) : null, keyFileBytes ? new Uint8Array(keyFileBytes) : null);
            const db = await kdbxweb.Kdbx.load(kdbxBytes, creds);
            // Return light metadata only
            postMessage({ ok: true, stats: { groups: db.groups.length, entries: db.getDefaultGroup()?.entries.length ?? 0 } });
        }
    }
    catch (err) {
        postMessage({ ok: false, error: err?.message || String(err) });
    }
};
