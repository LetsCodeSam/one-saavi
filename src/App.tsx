import React, { useMemo, useState } from "react";
import { pickKdbx, ensurePerm, readBytes, writeBytes } from "./fs/fileAccess";
import { openKdbx, saveKdbx } from "./crypto/keepass";
import EntryList from "./ui/EntryList";
import EntryView from "./ui/EntryView";
import GroupTree, { GroupNode } from "./ui/GroupTree";

function unwrap(val: any): string { if (!val) return ""; return val.getText ? val.getText() : String(val); }
function field(en: any, key: string): string {
  const v = en?.fields?.get ? en.fields.get(key) : en?.fields?.[key];
  return unwrap(v);
}

export default function App() {
  const [db, setDb] = useState<any>(null);
  const [handle, setHandle] = useState<FileSystemFileHandle | null>(null);
  const [status, setStatus] = useState("Ready");
  const [fileName, setFileName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [openedEntryId, setOpenedEntryId] = useState<string | null>(null);

  async function doOpen() {
    try {
      const h = await pickKdbx();
      await ensurePerm(h, "readwrite");
      const f = await h.getFile();
      setFileName(f.name);
      setHandle(h);
      const bytes = await readBytes(h);
      const pw = prompt("Master password") ?? "";
      const opened = await openKdbx(bytes, pw);
      setDb(opened);
      setDirty(false);
      setSelectedGroupId(null);
      setOpenedEntryId(null);
      setStatus("Opened");
    } catch (e: any) { setStatus(e?.message || "Open failed"); }
  }

  async function doSave() {
    if (!db || !handle) return;
    try {
      const out = await saveKdbx(db);
      await writeBytes(handle, out);
      setDirty(false);
      setStatus("Saved");
    } catch (e: any) { setStatus(e?.message || "Save failed"); }
  }

  // Prefer group named "Saavi"; else default group; else first group
  const rootGroup = useMemo(() => {
    if (!db) return null;
    let found: any = null;
    function search(g: any) {
      if (unwrap(g.name) === "Saavi") { found = g; return; }
      g.groups?.forEach((x: any) => { if (!found) search(x); });
    }
    db.groups?.forEach((g: any) => search(g));
    const fallback = db.getDefaultGroup?.() ?? db.groups?.[0] ?? null;
    const root = found || fallback;
    // debug: verify we picked something
    // console.debug("root group:", root?.uuid?.id, unwrap(root?.name));
    return root;
  }, [db]);

  // Build the tree
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

  // Entries filtered by selected group (null → all under root)
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
  function markDirty() { setDirty(true); setStatus("Edited"); }

  return (
    <div style={{ maxWidth: 1100, margin: "1.5rem auto", fontFamily: "ui-sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>One Saavi</h1>
      <p style={{ opacity: 0.8 }}>
        Status: {status}{fileName ? ` • ${fileName}` : ""}{dirty ? " • Dirty" : ""}
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={doOpen}>Open .kdbx</button>
        <button onClick={doSave} disabled={!db || !handle || !dirty}>Save</button>
      </div>

      {db && (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, marginTop: 20 }}>
          <aside style={{ borderRight: "1px solid #eee", paddingRight: 8 }}>
            <h3>Groups</h3>
            <GroupTree
              tree={groupTree}
              selectedId={selectedGroupId}
              onSelect={setSelectedGroupId}
            />
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
    </div>
  );
}
