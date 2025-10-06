import React, { useEffect, useMemo, useRef, useState } from "react";
import { pickKdbx, ensurePerm, readBytes, writeBytes } from "./fs/fileAccess";
import { openKdbx, saveKdbx, addNewEntry, createNewDb } from "./crypto/keepass";
import EntryList from "./ui/EntryList";
import EntryView from "./ui/EntryView";
import GroupTree, { GroupNode } from "./ui/GroupTree";
import UnlockDialog from "./ui/UnlockDialog";
import { saveVaultBytes, loadVaultBytes } from "./fs/mobileStore";
import { setupPWAInstall, triggerInstall } from "./pwa/install";
import { isIOS, isStandaloneIOS } from "./pwa/ios";
import { rememberHandle, getRememberedHandle } from "./fs/recents";
import "./app.css";


/* ---------------- helpers ---------------- */
function unwrap(val: any): string {
  if (!val) return "";
  return val.getText ? val.getText() : String(val);
}
function field(en: any, key: string): string {
  const v = en?.fields?.get ? en.fields.get(key) : en?.fields?.[key];
  return unwrap(v);
}
const hasFilePicker = () => "showOpenFilePicker" in window;

/* ---------------- component ---------------- */
export default function App() {
  const [db, setDb] = useState<any>(null);
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
  const [status, setStatus] = useState("Ready");
  const [fileName, setFileName] = useState("");
  const [dirty, setDirty] = useState(false);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [openedEntryId, setOpenedEntryId] = useState<string | null>(null);

  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pendingBytes, setPendingBytes] = useState<ArrayBuffer | null>(null);

  const [q, setQ] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---- Auto-lock ---- */
  const [autoLockMins, setAutoLockMins] = useState<number>(5);
  const idleTimer = useRef<number | null>(null);
  const lastVisibleAt = useRef<number>(Date.now());

  /* ---- Clipboard countdown ticker ---- */
  const clipboardTicker = useRef<number | null>(null);

  /* ---- PWA install ---- */
  const [canInstall, setCanInstall] = useState(false);
  useEffect(() => { setupPWAInstall(setCanInstall); }, []);

  /* ---- iOS helper modal ---- */
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  /* --------- Auto-lock helpers --------- */
  function clearIdleTimer() {
    if (idleTimer.current != null) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
  }
  function scheduleIdleTimer() {
    clearIdleTimer();
    if (!db || autoLockMins <= 0) return;
    idleTimer.current = window.setTimeout(() => {
      lockNow("Auto-locked after inactivity");
    }, autoLockMins * 60_000);
  }
  function noteActivity() {
    if (!db) return;
    scheduleIdleTimer();
  }
  function onVisibilityChange() {
    if (document.visibilityState === "visible") {
      const hiddenForMs = Date.now() - lastVisibleAt.current;
      if (hiddenForMs >= autoLockMins * 60_000 && db) {
        lockNow("Auto-locked while tab hidden");
      } else {
        scheduleIdleTimer();
      }
    } else {
      lastVisibleAt.current = Date.now();
    }
  }
  function stopClipboardTicker() {
    if (clipboardTicker.current != null) {
      clearInterval(clipboardTicker.current);
      clipboardTicker.current = null;
    }
  }
  function lockNow(reason = "Locked") {
    if (!db) return;
    setDb(null);
    setSelectedGroupId(null);
    setOpenedEntryId(null);
    setQ("");
    setDirty(false);
    setUnlockOpen(false);
    setDrawerOpen(false);
    clearIdleTimer();
    stopClipboardTicker();
    setStatus(reason);
    try {
      navigator.clipboard.writeText(" ");
      navigator.clipboard.writeText("");
    } catch {}
  }
  useEffect(() => {
    const act = () => noteActivity();
    window.addEventListener("pointerdown", act, { passive: true });
    window.addEventListener("keydown", act);
    window.addEventListener("touchstart", act, { passive: true });
    window.addEventListener("mousemove", act);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pointerdown", act);
      window.removeEventListener("keydown", act);
      window.removeEventListener("touchstart", act);
      window.removeEventListener("mousemove", act);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [db, autoLockMins]);
  useEffect(() => { db ? scheduleIdleTimer() : clearIdleTimer(); }, [db, autoLockMins]);
  useEffect(() => () => stopClipboardTicker(), []);

  /* --------- OPEN / SAVE --------- */
  async function doOpen() {
    try {
      const h = await pickKdbx();
      await ensurePerm(h, "readwrite");
      const f = await h.getFile();
      setFileName(f.name);
      setHandle(h);
      await rememberHandle(h);
      const bytes = await readBytes(h);
      setPendingBytes(bytes);
      setUnlockOpen(true);
    } catch (e: any) {
      setStatus(e?.message || "Open failed");
    }
  }
  async function doSave() {
    if (!db || !handle) return;
    try {
      const out = await saveKdbx(db);
      await writeBytes(handle, out);
      setDirty(false);
      setStatus("Saved");
    } catch (e: any) {
      setStatus(e?.message || "Save failed");
    }
  }
  async function handleMobileFile(file: File) {
    setFileName(file.name);
    setHandle(null);
    const bytes = await file.arrayBuffer();
    setPendingBytes(bytes);
    setUnlockOpen(true);
  }
  async function saveAsDownload() {
    if (!db) return;
    try {
      const out = await saveKdbx(db);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([out], { type: "application/octet-stream" }));
      a.download = (fileName || "vault") + ".kdbx";
      a.click();
      URL.revokeObjectURL(a.href);
      setDirty(false);
      setStatus("Saved (download)");
    } catch (e: any) {
      setStatus(e?.message || "Save failed");
    }
  }

  /* --------- UNLOCK --------- */
  async function handleUnlock(password: string, keyFile?: File) {
    if (!pendingBytes) return;
    try {
      const keyBytes = keyFile ? await keyFile.arrayBuffer() : undefined;
      const opened = await openKdbx(pendingBytes, password, keyBytes);
      setDb(opened);
      setDirty(false);
      setSelectedGroupId(null);
      setOpenedEntryId(null);
      setStatus(handle ? "Opened" : "Opened (mobile)");
      if (!hasFilePicker()) {
        await saveVaultBytes(pendingBytes, fileName || "vault.kdbx");
      }
      setUnlockOpen(false);
      scheduleIdleTimer();
    } catch (e: any) {
      setStatus(e?.message || "Unlock failed");
    } finally {
      setPendingBytes(null);
    }
  }

  /* --------- ROOT GROUP / TREE --------- */
  const rootGroup = useMemo(() => {
    if (!db) return null;
    let found: any = null;
    function search(g: any) {
      if (unwrap(g.name) === "Saavi") { found = g; return; }
      g.groups?.forEach((x: any) => { if (!found) search(x); });
    }
    db.groups?.forEach((g: any) => search(g));
    return found || db.getDefaultGroup?.() || db.groups?.[0] || null;
  }, [db]);

  const groupTree: GroupNode | null = useMemo(() => {
    if (!rootGroup) return null;
    function build(g: any): GroupNode {
      return {
        id: g.uuid?.id ?? crypto.randomUUID(),
        name: unwrap(g.name) || "(group)",
        count: g.entries?.length ?? 0,
        children: (g.groups || []).map((x: any) => build(x)),
      };
    }
    return build(rootGroup);
  }, [rootGroup]);

  /* --------- ENTRIES / FILTER --------- */
  const entries = useMemo(() => {
    if (!db || !rootGroup) return [];
    const out: any[] = [];
    function collectAll(g: any) {
      g.entries?.forEach((en: any) => {
        out.push({
          uuid: en.uuid?.id ?? crypto.randomUUID(),
          title: field(en, "Title"),
          username: field(en, "UserName"),
          url: field(en, "URL"),
          _ref: en,
        });
      });
      (g.groups || []).forEach(collectAll);
    }
    function collectFromId(g: any, id: string): boolean {
      if (g.uuid?.id === id) { collectAll(g); return true; }
      return (g.groups || []).some((x: any) => collectFromId(x, id));
    }
    if (!selectedGroupId) collectAll(rootGroup);
    else collectFromId(rootGroup, selectedGroupId);
    return out;
  }, [db, rootGroup, selectedGroupId]);

  const filteredEntries = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter((e: any) =>
      (e.title || "").toLowerCase().includes(s) ||
      (e.username || "").toLowerCase().includes(s) ||
      (e.url || "").toLowerCase().includes(s)
    );
  }, [entries, q]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.uuid === openedEntryId)?._ref,
    [entries, openedEntryId]
  );

  /* --------- actions --------- */
  async function revealPassword(entryUuid: string): Promise<string> {
    const item = entries.find((e) => e.uuid === entryUuid);
    if (!item) return "";
    const pv = item._ref?.fields?.get ? item._ref.fields.get("Password") : item._ref?.fields?.Password;
    return unwrap(pv);
  }

  async function copyAndClear(text: string, ms = 15000) {
    if (!text) return;

    // Stop previous countdown if any
    stopClipboardTicker();

    await navigator.clipboard.writeText(text);

    let secs = Math.max(1, Math.round(ms / 1000));
    setStatus(`Copied (clears in ${secs}s)`);

    clipboardTicker.current = window.setInterval(() => {
      secs -= 1;
      if (secs > 0) {
        setStatus(`Copied (clears in ${secs}s)`);
      } else {
        stopClipboardTicker();
        try {
          navigator.clipboard.writeText(" ");
          navigator.clipboard.writeText("");
        } catch {}
        setStatus("Clipboard cleared");
      }
    }, 1000);

    noteActivity();
  }

  function markDirty() { setDirty(true); setStatus("Edited"); noteActivity(); }

  /* --------- Reopen last / (optional) --------- */

  async function reopenLast() {
    try {
      if (hasFilePicker()) {
        const h = await getRememberedHandle();
        if (h) {
          await ensurePerm(h, "readwrite");
          const f = await h.getFile();
          setFileName(f.name);
          setHandle(h);
          const bytes = await readBytes(h);
          setPendingBytes(bytes);
          setUnlockOpen(true);
          setStatus("Ready to unlock last file");
          return;
        }
      }
      const rec = await loadVaultBytes();
      if (rec) {
        setFileName(rec.name);
        setHandle(null);
        setPendingBytes
        setUnlockOpen(true);
        setStatus("Ready to unlock cached mobile vault");
        return;
      }
      setStatus("No previous vault remembered");
    } catch (e: any) {
      setStatus(e?.message || "Reopen failed");
    }
  }

  

  /* ---------------- UI ---------------- */
  return (
    <div style={{ maxWidth: 1100, margin: "1.5rem auto", fontFamily: "ui-sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>One Saavi</h1>
      <p style={{ opacity: 0.8 }}>
        Status: {status}{fileName ? ` • ${fileName}` : ""}{dirty ? " • Dirty" : ""}
      </p>

      <div className="topbar" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {db && (
          <button className="mobile-only" onClick={() => setDrawerOpen(true)} aria-label="Open groups">
            ☰ Groups
          </button>
        )}

        <button onClick={doOpen}>Open .kdbx</button>
        <button onClick={reopenLast}>Reopen last</button>
                <button onClick={doSave} disabled={!db || !handle || !dirty}>Save</button>

        {!hasFilePicker() && (
          <>
            <label style={{ border: "1px solid #ccc", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }}>
              <input
                type="file"
                accept=".kdbx"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleMobileFile(file);
                }}
              />
              Open (mobile)
            </label>
            <button onClick={saveAsDownload} disabled={!db || !dirty}>Save As (.kdbx)</button>
          </>
        )}

        {db && (
          <>
            <button onClick={() => lockNow("Locked manually")}>Lock now</button>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span>Auto-lock (mins)</span>
              <select value={autoLockMins} onChange={(e) => setAutoLockMins(Number(e.target.value))}>
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
              </select>
            </label>
          </>
        )}

        {db && (
          <input
            className="toolbar-search"
            placeholder="Search title, username, or URL…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6 }}
          />
        )}

        {canInstall && (
          <button
            onClick={async () => {
              const res = await triggerInstall();
              if (res === "accepted") setStatus("App installed");
              else if (res === "dismissed") setStatus("Install dismissed");
            }}
            title="Install this app"
          >
            Install app
          </button>
        )}
        {!canInstall && isIOS() && !isStandaloneIOS() && (
          <button onClick={() => setShowIOSHelp(true)} title="Add to Home Screen on iOS">
            Install on iOS
          </button>
        )}
      </div>

      {db && (
        <div className="app-grid">
          {drawerOpen && <div className="drawer-backdrop mobile-only" onClick={() => setDrawerOpen(false)} />}
          <aside className={`sidebar ${drawerOpen ? "open" : ""}`}>
            <h3>Groups</h3>
            <GroupTree
              tree={groupTree}
              selectedId={selectedGroupId}
              onSelect={(id) => { setSelectedGroupId(id); setDrawerOpen(false); noteActivity(); }}
            />
          </aside>

          <main className="main">
            <h2>Entries {q ? `(${filteredEntries.length})` : `(${entries.length})`}</h2>
            <div className="table-wrap">
              <EntryList
                entries={filteredEntries}
                onReveal={revealPassword}
                onCopy={copyAndClear}
                onOpen={(id) => { setOpenedEntryId(id); noteActivity(); }}
              />
            </div>
            {selectedEntry && (
              <div style={{ marginTop: 20 }}>
                <EntryView
                  entry={selectedEntry}
                  onChange={markDirty}
                  onClose={() => { setOpenedEntryId(null); noteActivity(); }}
                  onCopy={copyAndClear}
                />
              </div>
            )}
          </main>
        </div>
      )}

      <UnlockDialog
        open={unlockOpen}
        onCancel={() => { setUnlockOpen(false); setPendingBytes(null); }}
        onUnlock={handleUnlock}
      />

      {showIOSHelp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.4)",
            display: "grid",
            placeItems: "center",
            zIndex: 100
          }}
          onClick={() => setShowIOSHelp(false)}
        >
          <div
            style={{ background: "#fff", padding: 16, borderRadius: 8, maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Install on iOS</h3>
            <ol style={{ lineHeight: 1.6 }}>
              <li>Open this site in <strong>Safari</strong>.</li>
              <li>Tap the <strong>Share</strong> icon (square with an up arrow).</li>
              <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong>. Launch from the new home screen icon.</li>
            </ol>
            <p style={{ fontSize: 14, opacity: .8, marginTop: 8 }}>
              Tip: On iOS, Chrome/Edge also rely on Safari’s engine and don’t show a native install prompt.
              Use Safari for Add to Home Screen.
            </p>
            <div style={{ textAlign: "right" }}>
              <button onClick={() => setShowIOSHelp(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
