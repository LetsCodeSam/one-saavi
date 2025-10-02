import React, { useMemo, useState } from "react";
import { pickKdbx, ensurePerm, readBytes, writeBytes } from "./fs/fileAccess";
import { openKdbx, saveKdbx } from "./crypto/keepass";
import EntryList from "./ui/EntryList";
import EntryView from "./ui/EntryView";
import GroupTree, { GroupNode } from "./ui/GroupTree";
import UnlockDialog from "./ui/UnlockDialog";
import { saveVaultBytes } from "./fs/mobileStore";

// ---------- helpers ----------
function unwrap(val: any): string {
  if (!val) return "";
  return val.getText ? val.getText() : String(val);
}
function field(en: any, key: string): string {
  const v = en?.fields?.get ? en.fields.get(key) : en?.fields?.[key];
  return unwrap(v);
}
const hasFilePicker = () => "showOpenFilePicker" in window;

// ---------- component ----------
export default function App() {
  const [db, setDb] = useState<any>(null);
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
  const [status, setStatus] = useState("Ready");
  const [fileName, setFileName] = useState("");
  const [dirty, setDirty] = useState(false);

  // selection
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [openedEntryId, setOpenedEntryId] = useState<string | null>(null);

  // unlock dialog plumbing
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pendingBytes, setPendingBytes] = useState<ArrayBuffer | null>(null);

  // ----- OPEN (desktop / File System Access API) -----
  async function doOpen() {
    try {
      const h = await pickKdbx();
      await ensurePerm(h, "readwrite");
      const f = await h.getFile();
      setFileName(f.name);
      setHandle(h);

      const bytes = await readBytes(h);
      setPendingBytes(bytes);
      setUnlockOpen(true);
    } catch (e: any) {
      setStatus(e?.message || "Open failed");
    }
  }

  // ----- SAVE (desktop) -----
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

  // ----- MOBILE: open via <input type=file> & Save As (.kdbx) -----
  async function handleMobileFile(file: File) {
    setFileName(file.name);
    setHandle(null); // no persistent handle on iOS
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

  // ----- Unlock handler used by the dialog -----
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
        await saveVaultBytes(pendingBytes, fileName || "vault.kdbx"); // encrypted bytes only
      }
      setUnlockOpen(false);
    } catch (e: any) {
      setStatus(e?.message || "Unlock failed");
    } finally {
      setPendingBytes(null);
    }
  }

  // ----- root group (prefer a group named "Saavi") -----
  const rootGroup = useMemo(() => {
    if (!db) return null;
    let found: any = null;
    function search(g: any) {
      if (unwrap(g.name) === "Saavi") { found = g; return; }
      g.groups?.forEach((x: any) => { if (!found) search(x); });
    }
    db.groups?.forEach((g: any) => search(g));
    const fallback = db.getDefaultGroup?.() ?? db.groups?.[0] ?? null;
    return found || fallback;
  }, [db]);

  // ----- build sidebar tree -----
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

  // ----- entries filtered by selected group -----
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
      const hit = g.uuid?.id === id;
      if (hit) { collectAll(g); return true; }
      return (g.groups || []).some((x: any) => collectFromId(x, id));
    }

    if (!selectedGroupId) collectAll(rootGroup);
    else collectFromId(rootGroup, selectedGroupId);

    return out;
  }, [db, rootGroup, selectedGroupId]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.uuid === openedEntryId)?._ref,
    [entries, openedEntryId]
  );

  // ----- actions -----
  async function revealPassword(entryUuid: string): Promise<string> {
    const item = entries.find((e) => e.uuid === entryUuid);
    if (!item) return "";
    const pv = item._ref?.fields?.get ? item._ref.fields.get("Password") : item._ref?.fields?.Password;
    return unwrap(pv);
  }

  async function copyAndClear(text: string, ms = 15000) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setStatus("Copied to clipboard");
    setTimeout(async () => { try { await navigator.clipboard.writeText(""); } catch {} }, ms);
  }

  function markDirty() {
    setDirty(true);
    setStatus("Edited");
  }

  // ---------- UI ----------
  return (
    <div style={{ maxWidth: 1100, margin: "1.5rem auto", fontFamily: "ui-sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>One Saavi</h1>
      <p style={{ opacity: 0.8 }}>
        Status: {status}{fileName ? ` • ${fileName}` : ""}{dirty ? " • Dirty" : ""}
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {/* Desktop path */}
        <button onClick={doOpen}>Open .kdbx</button>
        <button onClick={doSave} disabled={!db || !handle || !dirty}>Save</button>

        {/* Mobile / unsupported browsers fallback */}
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
      </div>

      {db && (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, marginTop: 20 }}>
          <aside style={{ borderRight: "1px solid #eee", paddingRight: 8 }}>
            <h3>Groups</h3>
            <GroupTree tree={groupTree} selectedId={selectedGroupId} onSelect={setSelectedGroupId} />
          </aside>

          <main>
            <h2>Entries</h2>
            <EntryList
              entries={entries}
              onReveal={revealPassword}
              onCopy={copyAndClear}
              onOpen={(id) => setOpenedEntryId(id)}
            />
            {selectedEntry && (
              <div style={{ marginTop: 20 }}>
                <EntryView
                  entry={selectedEntry}
                  onChange={markDirty}
                  onClose={() => setOpenedEntryId(null)}
                  onCopy={copyAndClear}
                />
              </div>
            )}
          </main>
        </div>
      )}

      {/* Masked unlock dialog */}
      <UnlockDialog
        open={unlockOpen}
        onCancel={() => { setUnlockOpen(false); setPendingBytes(null); }}
        onUnlock={handleUnlock}
      />
    </div>
  );
}
