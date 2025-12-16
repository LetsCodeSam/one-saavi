import React, { useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import { Button, Box, TextField, Select, MenuItem, InputLabel, FormControl, useMediaQuery, IconButton, Menu, Divider, Typography, Drawer, Toolbar } from "@mui/material";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';

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
import Layout from "./components/Layout";
import theme from "./theme";
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
  const READ_ONLY = false; // toggle

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [openedEntryId, setOpenedEntryId] = useState<string | null>(null);
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set());

  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pendingBytes, setPendingBytes] = useState<ArrayBuffer | null>(null);

  const [q, setQ] = useState("");

  // NOTE: Layout handles drawer state internally now, but we removed manual toggle
  // const [drawerOpen, setDrawerOpen] = useState(false);

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

  /* ---- Local Vault Detection ---- */
  const [hasLocalVault, setHasLocalVault] = useState(false);
  useEffect(() => {
    if (!hasFilePicker()) {
      loadVaultBytes().then(res => {
        if (res.bytes) setHasLocalVault(true);
      });
    }
  }, []);

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
    // setDrawerOpen(false); // Layout handles this
    clearIdleTimer();
    stopClipboardTicker();
    setStatus(reason);
    try {
      navigator.clipboard.writeText(" ");
      navigator.clipboard.writeText("");
    } catch { }
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

  const [dbVersion, setDbVersion] = useState(0);
  const [fileLastModified, setFileLastModified] = useState<number>(0);

  /* --------- OPEN / SAVE --------- */
  async function doOpen() {
    try {
      const h = await pickKdbx();
      await ensurePerm(h, "read"); // Don't ask for write until we save
      const f = await h.getFile();
      setFileName(f.name);
      setFileLastModified(f.lastModified);
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
    if (READ_ONLY || !db) return; // Allow save without handle (for mobile/local)
    try {
      if (handle) {
        await ensurePerm(handle, "readwrite"); // Ask for permission now

        // Stale Check
        const fileOnDisk = await handle.getFile();
        if (fileOnDisk.lastModified > fileLastModified) {
          alert("CRITICAL: The file has been modified by another app (e.g., OneDrive/Dropbox sync) since you opened it.\n\nSaving now would OVERWRITE those changes.\n\nPlease reload the file and re-apply your changes.");
          setStatus("Save blocked: File changed externally");
          return;
        }

        const out = await saveKdbx(db);
        await writeBytes(handle, out);

        // Update our timestamp to match the new file we just wrote
        const newFile = await handle.getFile();
        setFileLastModified(newFile.lastModified);
        setStatus("Saved");

        // Clear "Edited" highlights since we successfully wrote to disk
        setModifiedIds(new Set());
      } else {
        // Mobile / Local Save
        const out = await saveKdbx(db);
        await saveVaultBytes(out, fileName || "vault.kdbx", Array.from(modifiedIds));
        setStatus("Saved to App Cache");
      }

      setDbVersion(v => v + 1); // Refresh list to show accepted edits
      setDirty(false);
    } catch (e: any) {
      console.error(e);
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

      // Fix double extension if present
      let name = fileName || "vault";
      if (!name.toLowerCase().endsWith(".kdbx")) name += ".kdbx";

      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([out], { type: "application/octet-stream" }));
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);

      // Clear dirty state and local modified markers since we exported a clean version
      setDirty(false);
      setModifiedIds(new Set());

      // Also update local cache to be "clean" so Resume doesn't show "Edited" tags
      if (!hasFilePicker()) {
        await saveVaultBytes(out, name, []);
      }

      setDbVersion(v => v + 1);
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
      setDbVersion(0);
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
  }, [db, dbVersion]);

  const groupTree: GroupNode | null = useMemo(() => {
    if (!rootGroup) return null;
    function build(g: any): GroupNode {
      const children = (g.groups || []).map((x: any) => build(x));
      const selfModified = g.entries?.some((e: any) => modifiedIds.has(e.uuid?.id));
      const childModified = children.some((c: any) => c.hasModified);
      return {
        id: g.uuid?.id ?? crypto.randomUUID(),
        name: unwrap(g.name) || "(group)",
        count: g.entries?.length ?? 0,
        children,
        hasModified: selfModified || childModified
      };
    }
    return build(rootGroup);
  }, [rootGroup, dbVersion, modifiedIds]);

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
  }, [db, rootGroup, selectedGroupId, dbVersion]);

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
        } catch { }
        setStatus("Clipboard cleared");
      }
    }, 1000);
    noteActivity();
  }

  function markDirty(id?: string) {
    if (READ_ONLY) return;
    setDirty(true);
    if (id) {
      setModifiedIds(s => {
        const n = new Set(s);
        n.add(id);
        return n;
      });
    }
    setStatus("Edited");
    noteActivity();
  }

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
        setPendingBytes(rec.bytes);
        if (rec.modifiedIds) setModifiedIds(new Set(rec.modifiedIds));
        setUnlockOpen(true);
        setStatus("Resumed local copy. Use Menu > Download .kdbx to sync.");
        return;
      }
      setStatus("No previous vault found on device");
    } catch (e: any) {
      setStatus(e?.message || "Reopen failed");
    }
  }

  /* --------- Create New Vault (from original) --------- */
  async function createNewVault() {
    try {
      const pw = window.prompt("Set a master password for the new vault:");
      if (!pw) return;

      // Desktop: Get handle FIRST to satisfy "user gesture" requirement
      let newHandle: FileSystemFileHandle | null = null;
      if (hasFilePicker()) {
        try {
          newHandle = await (window as any).showSaveFilePicker({
            suggestedName: "new-vault.kdbx",
            types: [{ description: "KeePass Database", accept: { "application/x-keepass2": [".kdbx"] } }],
          });
        } catch (pickerErr) {
          // User cancelled picker
          return;
        }
      }

      // Now do the expensive crypto work
      setStatus("Creating vault...");
      const newDb = await createNewDb(pw, "Saavi");

      setDb(newDb);
      setSelectedGroupId(null);
      setOpenedEntryId(null);

      const out = await saveKdbx(newDb);

      if (newHandle) {
        // We already have the handle from step 1
        await ensurePerm(newHandle, "readwrite");
        await writeBytes(newHandle, out);

        setHandle(newHandle);
        const f = await newHandle.getFile();
        setFileName(f.name || "new-vault.kdbx");
        setFileLastModified(f.lastModified);
        setDirty(false);
        await rememberHandle(newHandle);
        setStatus("New vault created");
      } else {
        // Mobile / No Picker Download
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([out], { type: "application/octet-stream" }));
        a.download = "new-vault.kdbx";
        a.click();
        URL.revokeObjectURL(a.href);
        setDirty(false);
        setStatus("New vault created (downloaded)");
      }
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message || "Create failed");
    }
  }

  function handleAddEntry() {
    if (!db || !rootGroup) return;
    try {
      // Find target group (default to root)
      let targetGroup = rootGroup;
      if (selectedGroupId && selectedGroupId !== rootGroup.uuid?.id) {
        // Recursive find
        const findG = (g: any): any => {
          if (g.uuid?.id === selectedGroupId) return g;
          for (const sub of (g.groups || [])) {
            const found = findG(sub);
            if (found) return found;
          }
          return null;
        }
        const found = findG(rootGroup);
        if (found) targetGroup = found;
      }

      const newEntry = addNewEntry(db, targetGroup);
      setOpenedEntryId(newEntry.uuid.id);
      markDirty(newEntry.uuid.id);
      setDbVersion(v => v + 1);
      setStatus("New entry added");
    } catch (e: any) {
      console.error(e);
      setStatus("Failed to add entry");
    }
  }

  /* ---------------- UI ---------------- */
  /* ---------------- UI ---------------- */
  // Responsive Helpers
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // Prepare Toolbar Actions
  const toolbarActions = (
    <>


      {/* Desktop: Full Buttons | Mobile: Menu */}
      {!isMobile ? (
        <>
          {/* Open: Desktop vs Mobile */}
          {hasFilePicker() ? (
            <Button color="inherit" onClick={doOpen}>Open</Button>
          ) : (
            <Button color="inherit" component="label">
              Open File
              <input type="file" accept=".kdbx,application/octet-stream" hidden onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleMobileFile(file);
              }} />
            </Button>
          )}

          <Button color="inherit" onClick={reopenLast}>Recents</Button>
          <Button color="inherit" onClick={createNewVault}>New</Button>

          {/* Save: Desktop vs Mobile */}
          {hasFilePicker() ? (
            <Button color="inherit" onClick={doSave} disabled={!db || !handle || !dirty}>Save</Button>
          ) : (
            <Button color="inherit" onClick={saveAsDownload} disabled={!db || !dirty}>Save As</Button>
          )}

          {db && <Button color="inherit" onClick={handleAddEntry} startIcon={<AddIcon />}>Add Entry</Button>}

          {db && <Button color="inherit" onClick={() => lockNow("Locked manually")}>Lock</Button>}

          {canInstall && (
            <Button color="secondary" variant="contained" onClick={async () => {
              const res = await triggerInstall();
              if (res === "accepted") setStatus("App installed");
            }} sx={{ ml: 1 }}>
              Install
            </Button>
          )}
        </>
      ) : (
        <>
          <IconButton color="inherit" onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            {hasFilePicker() ? (
              <MenuItem onClick={() => { handleMenuClose(); doOpen(); }}>Open</MenuItem>
            ) : (
              <MenuItem component="label">
                Open File
                <input type="file" accept=".kdbx,application/octet-stream" hidden onChange={async (e) => {
                  handleMenuClose();
                  const file = e.target.files?.[0];
                  if (file) await handleMobileFile(file);
                }} />
              </MenuItem>
            )}

            <MenuItem onClick={() => { handleMenuClose(); reopenLast(); }}>Recents</MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); createNewVault(); }}>New Vault</MenuItem>
            <Divider />

            {hasFilePicker() ? (
              <MenuItem onClick={() => { handleMenuClose(); doSave(); }} disabled={!db || !handle || !dirty}>Save</MenuItem>
            ) : (
              <>
                <MenuItem onClick={() => { handleMenuClose(); doSave(); }} disabled={!db || !dirty}>Save (Local)</MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); saveAsDownload(); }} disabled={!db}>Download .kdbx</MenuItem>
              </>
            )}

            {db && (
              <MenuItem onClick={() => { handleMenuClose(); handleAddEntry(); }}>Add Entry</MenuItem>
            )}

            {db && (
              <MenuItem onClick={() => { handleMenuClose(); lockNow("Locked manually"); }}>Lock Vault</MenuItem>
            )}

            {canInstall && (
              <MenuItem onClick={async () => {
                handleMenuClose();
                const res = await triggerInstall();
                if (res === "accepted") setStatus("App installed");
              }}>
                Install App
              </MenuItem>
            )}
            {!canInstall && isIOS() && !isStandaloneIOS() && (
              <MenuItem onClick={() => { handleMenuClose(); setShowIOSHelp(true); }}>iOS Install Info</MenuItem>
            )}
          </Menu>
        </>
      )}

      {/* Search Bar - Always Visible but flexible */}
      {db && (
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{
            bgcolor: 'rgba(255,255,255,0.1)',
            borderRadius: 1,
            input: { color: 'white', py: 0.5 },
            fieldset: { border: 'none' },
            width: { xs: 120, sm: 200, md: 250 },
            ml: 1
          }}
        />
      )}

      {/* AutoLock Select - Keep visible or move to menu? Keeping visible for now as it's small */}
      {db && !isMobile && (
        <FormControl variant="standard" sx={{ ml: 1, minWidth: 60 }}>
          <Select
            value={autoLockMins}
            onChange={(e) => setAutoLockMins(Number(e.target.value))}
            sx={{ color: 'inherit', '&:before': { borderBottomColor: 'white' }, '& svg': { color: 'white' } }}
          >
            <MenuItem value={1}>1m</MenuItem>
            <MenuItem value={5}>5m</MenuItem>
            <MenuItem value={15}>15m</MenuItem>
          </Select>
        </FormControl>
      )}
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <Layout
        title="One Saavi"
        status={status}
        toolbarActions={toolbarActions}
        sidebar={db ? (
          <GroupTree
            tree={groupTree}
            selectedId={selectedGroupId}
            onSelect={(id) => { setSelectedGroupId(id); noteActivity(); }}
            modifiedIds={modifiedIds}
          />
        ) : null}
      >
        {db ? (
          <>
            <Box sx={{ mb: 2 }}>
              {/* Title or Breadcrumbs could go here */}
            </Box>
            <Box className="table-wrap">
              <EntryList
                entries={filteredEntries}
                onReveal={revealPassword}
                onCopy={copyAndClear}
                onOpen={(id) => { setOpenedEntryId(id); noteActivity(); }}
                modifiedIds={modifiedIds}
              />
            </Box>

            <Drawer
              anchor="right"
              open={!!selectedEntry}
              onClose={() => { setOpenedEntryId(null); noteActivity(); }}
              sx={{
                zIndex: (theme) => theme.zIndex.drawer,
                '& .MuiDrawer-paper': {
                  width: { xs: '100%', sm: 400, md: 500 },
                  boxSizing: 'border-box',
                }
              }}
            >
              <Toolbar />
              <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
                {selectedEntry && (
                  <EntryView
                    entry={selectedEntry}
                    onChange={() => markDirty(selectedEntry.uuid)}
                    onClose={() => { setOpenedEntryId(null); noteActivity(); }}
                    onSave={async () => { await doSave(); setOpenedEntryId(null); noteActivity(); }}
                    onCopy={copyAndClear}
                  />
                )}
              </Box>
            </Drawer>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', mt: 10, opacity: 0.6, p: 2 }}>
            <h2>Open a KeePass database to start</h2>

            {/* Resume Button for Mobile/Cached Sessions */}
            {hasLocalVault && (
              <Box sx={{ my: 4, p: 2, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 2, bgcolor: 'rgba(255,255,255,0.05)' }}>
                <Typography variant="h6" gutterBottom>Session Found</Typography>
                <Typography variant="body2" sx={{ mb: 2, opacity: 0.8 }}>
                  You have unsaved changes or a cached vault on this device.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={reopenLast}
                  fullWidth
                >
                  Resume / Unlock Vault
                </Button>
              </Box>
            )}

            <Typography
              variant="caption"
              sx={{
                position: 'fixed',
                bottom: 20,
                left: 0,
                width: '100%',
                textAlign: 'center',
                opacity: 0.3,
                fontFamily: 'monospace'
              }}
            >
              * SamLabs *
            </Typography>
          </Box>
        )}

        {/* Dialogs */}
        <UnlockDialog
          open={unlockOpen}
          onCancel={() => { setUnlockOpen(false); setPendingBytes(null); }}
          onUnlock={handleUnlock}
        />

        {showIOSHelp && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999,
            display: "grid", placeItems: "center"
          }} onClick={() => setShowIOSHelp(false)}>
            <div style={{ background: "#222", color: "#fff", padding: 24, borderRadius: 8, maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <h3>Install on iOS</h3>
              <ol style={{ lineHeight: 1.6 }}>
                <li>Open in Safari</li>
                <li>Tap Share</li>
                <li>Add to Home Screen</li>
              </ol>
              <Button onClick={() => setShowIOSHelp(false)}>Close</Button>
            </div>
          </div>
        )}
      </Layout>
    </ThemeProvider>
  );
}
