import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { Button, Box, TextField, Select, MenuItem, FormControl, useMediaQuery, IconButton, Menu, Divider, Typography, Drawer, Toolbar } from "@mui/material";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import { pickKdbx, ensurePerm, readBytes, writeBytes } from "./fs/fileAccess";
import { openKdbx, saveKdbx, addNewEntry, createNewDb } from "./crypto/keepass";
import EntryList from "./ui/EntryList";
import EntryView from "./ui/EntryView";
import GroupTree from "./ui/GroupTree";
import UnlockDialog from "./ui/UnlockDialog";
import { saveVaultBytes, loadVaultBytes } from "./fs/mobileStore";
import { setupPWAInstall, triggerInstall } from "./pwa/install";
import { isIOS, isStandaloneIOS } from "./pwa/ios";
import { rememberHandle, getRememberedHandle } from "./fs/recents";
import Layout from "./components/Layout";
import theme from "./theme";
import "./app.css";
/* ---------------- helpers ---------------- */
function unwrap(val) {
    if (!val)
        return "";
    return val.getText ? val.getText() : String(val);
}
function field(en, key) {
    const v = en?.fields?.get ? en.fields.get(key) : en?.fields?.[key];
    return unwrap(v);
}
const hasFilePicker = () => "showOpenFilePicker" in window;
/* ---------------- component ---------------- */
export default function App() {
    const [db, setDb] = useState(null);
    const [handle, setHandle] = useState(null);
    const [status, setStatus] = useState("Ready");
    const [fileName, setFileName] = useState("");
    const [dirty, setDirty] = useState(false);
    const READ_ONLY = true; // toggle
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [openedEntryId, setOpenedEntryId] = useState(null);
    const [unlockOpen, setUnlockOpen] = useState(false);
    const [pendingBytes, setPendingBytes] = useState(null);
    const [q, setQ] = useState("");
    // NOTE: Layout handles drawer state internally now, but we removed manual toggle
    // const [drawerOpen, setDrawerOpen] = useState(false);
    /* ---- Auto-lock ---- */
    const [autoLockMins, setAutoLockMins] = useState(5);
    const idleTimer = useRef(null);
    const lastVisibleAt = useRef(Date.now());
    /* ---- Clipboard countdown ticker ---- */
    const clipboardTicker = useRef(null);
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
        if (!db || autoLockMins <= 0)
            return;
        idleTimer.current = window.setTimeout(() => {
            lockNow("Auto-locked after inactivity");
        }, autoLockMins * 60000);
    }
    function noteActivity() {
        if (!db)
            return;
        scheduleIdleTimer();
    }
    function onVisibilityChange() {
        if (document.visibilityState === "visible") {
            const hiddenForMs = Date.now() - lastVisibleAt.current;
            if (hiddenForMs >= autoLockMins * 60000 && db) {
                lockNow("Auto-locked while tab hidden");
            }
            else {
                scheduleIdleTimer();
            }
        }
        else {
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
        if (!db)
            return;
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
        }
        catch { }
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
    const [fileLastModified, setFileLastModified] = useState(0);
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
        }
        catch (e) {
            setStatus(e?.message || "Open failed");
        }
    }
    async function doSave() {
        if (READ_ONLY || !db || !handle)
            return;
        try {
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
            setDbVersion(v => v + 1); // Refresh list to show accepted edits
            setDirty(false);
            setStatus("Saved");
        }
        catch (e) {
            setStatus(e?.message || "Save failed");
        }
    }
    async function handleMobileFile(file) {
        setFileName(file.name);
        setHandle(null);
        const bytes = await file.arrayBuffer();
        setPendingBytes(bytes);
        setUnlockOpen(true);
    }
    async function saveAsDownload() {
        if (!db)
            return;
        try {
            const out = await saveKdbx(db);
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([out], { type: "application/octet-stream" }));
            a.download = (fileName || "vault") + ".kdbx";
            a.click();
            URL.revokeObjectURL(a.href);
            setDirty(false);
            setDbVersion(v => v + 1);
            setStatus("Saved (download)");
        }
        catch (e) {
            setStatus(e?.message || "Save failed");
        }
    }
    /* --------- UNLOCK --------- */
    async function handleUnlock(password, keyFile) {
        if (!pendingBytes)
            return;
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
        }
        catch (e) {
            setStatus(e?.message || "Unlock failed");
        }
        finally {
            setPendingBytes(null);
        }
    }
    /* --------- ROOT GROUP / TREE --------- */
    const rootGroup = useMemo(() => {
        if (!db)
            return null;
        let found = null;
        function search(g) {
            if (unwrap(g.name) === "Saavi") {
                found = g;
                return;
            }
            g.groups?.forEach((x) => { if (!found)
                search(x); });
        }
        db.groups?.forEach((g) => search(g));
        return found || db.getDefaultGroup?.() || db.groups?.[0] || null;
    }, [db, dbVersion]);
    const groupTree = useMemo(() => {
        if (!rootGroup)
            return null;
        function build(g) {
            return {
                id: g.uuid?.id ?? crypto.randomUUID(),
                name: unwrap(g.name) || "(group)",
                count: g.entries?.length ?? 0,
                children: (g.groups || []).map((x) => build(x)),
            };
        }
        return build(rootGroup);
    }, [rootGroup, dbVersion]);
    /* --------- ENTRIES / FILTER --------- */
    const entries = useMemo(() => {
        if (!db || !rootGroup)
            return [];
        const out = [];
        function collectAll(g) {
            g.entries?.forEach((en) => {
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
        function collectFromId(g, id) {
            if (g.uuid?.id === id) {
                collectAll(g);
                return true;
            }
            return (g.groups || []).some((x) => collectFromId(x, id));
        }
        if (!selectedGroupId)
            collectAll(rootGroup);
        else
            collectFromId(rootGroup, selectedGroupId);
        return out;
    }, [db, rootGroup, selectedGroupId, dbVersion]);
    const filteredEntries = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s)
            return entries;
        return entries.filter((e) => (e.title || "").toLowerCase().includes(s) ||
            (e.username || "").toLowerCase().includes(s) ||
            (e.url || "").toLowerCase().includes(s));
    }, [entries, q]);
    const selectedEntry = useMemo(() => entries.find((e) => e.uuid === openedEntryId)?._ref, [entries, openedEntryId]);
    /* --------- actions --------- */
    async function revealPassword(entryUuid) {
        const item = entries.find((e) => e.uuid === entryUuid);
        if (!item)
            return "";
        const pv = item._ref?.fields?.get ? item._ref.fields.get("Password") : item._ref?.fields?.Password;
        return unwrap(pv);
    }
    async function copyAndClear(text, ms = 15000) {
        if (!text)
            return;
        stopClipboardTicker();
        await navigator.clipboard.writeText(text);
        let secs = Math.max(1, Math.round(ms / 1000));
        setStatus(`Copied (clears in ${secs}s)`);
        clipboardTicker.current = window.setInterval(() => {
            secs -= 1;
            if (secs > 0) {
                setStatus(`Copied (clears in ${secs}s)`);
            }
            else {
                stopClipboardTicker();
                try {
                    navigator.clipboard.writeText(" ");
                    navigator.clipboard.writeText("");
                }
                catch { }
                setStatus("Clipboard cleared");
            }
        }, 1000);
        noteActivity();
    }
    function markDirty() {
        if (READ_ONLY)
            return;
        setDirty(true);
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
                setPendingBytes;
                setUnlockOpen(true);
                setStatus("Ready to unlock cached mobile vault");
                return;
            }
            setStatus("No previous vault remembered");
        }
        catch (e) {
            setStatus(e?.message || "Reopen failed");
        }
    }
    /* --------- Create New Vault (from original) --------- */
    async function createNewVault() {
        try {
            const pw = window.prompt("Set a master password for the new vault:");
            if (!pw)
                return;
            const newDb = await createNewDb(pw, "Saavi");
            setDb(newDb);
            setDirty(true);
            setSelectedGroupId(null);
            setOpenedEntryId(null);
            if (hasFilePicker()) {
                const h = await window.showSaveFilePicker({
                    suggestedName: "new-vault.kdbx",
                    types: [{ description: "KeePass Database", accept: { "application/x-keepass2": [".kdbx"] } }],
                });
                await ensurePerm(h, "readwrite");
                const out = await saveKdbx(newDb);
                await writeBytes(h, out);
                setHandle(h);
                setFileName("new-vault.kdbx");
                setDirty(false);
                await rememberHandle(h);
                setStatus("New vault created");
            }
            else {
                const out = await saveKdbx(newDb);
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([out], { type: "application/octet-stream" }));
                a.download = "new-vault.kdbx";
                a.click();
                URL.revokeObjectURL(a.href);
                setDirty(false);
                setStatus("New vault created (downloaded)");
            }
        }
        catch (e) {
            setStatus(e?.message || "Create failed");
        }
    }
    function handleAddEntry() {
        if (!db)
            return;
        try {
            const newEntry = addNewEntry(db, rootGroup); // Adds to root group by default for now
            setOpenedEntryId(newEntry.uuid.id);
            markDirty();
            setDbVersion(v => v + 1);
            setStatus("New entry added");
        }
        catch (e) {
            setStatus("Failed to add entry");
        }
    }
    /* ---------------- UI ---------------- */
    /* ---------------- UI ---------------- */
    // Responsive Helpers
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [anchorEl, setAnchorEl] = React.useState(null);
    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    // Prepare Toolbar Actions
    const toolbarActions = (_jsxs(_Fragment, { children: [!isMobile ? (_jsxs(_Fragment, { children: [hasFilePicker() ? (_jsx(Button, { color: "inherit", onClick: doOpen, children: "Open" })) : (_jsxs(Button, { color: "inherit", component: "label", children: ["Open File", _jsx("input", { type: "file", accept: ".kdbx,application/octet-stream", hidden: true, onChange: async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file)
                                        await handleMobileFile(file);
                                } })] })), _jsx(Button, { color: "inherit", onClick: reopenLast, children: "Recents" }), _jsx(Button, { color: "inherit", onClick: createNewVault, children: "New" }), hasFilePicker() ? (_jsx(Button, { color: "inherit", onClick: doSave, disabled: !db || !handle || !dirty, children: "Save" })) : (_jsx(Button, { color: "inherit", onClick: saveAsDownload, disabled: !db || !dirty, children: "Save As" })), db && _jsx(Button, { color: "inherit", onClick: handleAddEntry, startIcon: _jsx(AddIcon, {}), children: "Add Entry" }), db && _jsx(Button, { color: "inherit", onClick: () => lockNow("Locked manually"), children: "Lock" }), canInstall && (_jsx(Button, { color: "secondary", variant: "contained", onClick: async () => {
                            const res = await triggerInstall();
                            if (res === "accepted")
                                setStatus("App installed");
                        }, sx: { ml: 1 }, children: "Install" }))] })) : (_jsxs(_Fragment, { children: [_jsx(IconButton, { color: "inherit", onClick: handleMenuOpen, children: _jsx(MoreVertIcon, {}) }), _jsxs(Menu, { anchorEl: anchorEl, open: Boolean(anchorEl), onClose: handleMenuClose, children: [hasFilePicker() ? (_jsx(MenuItem, { onClick: () => { handleMenuClose(); doOpen(); }, children: "Open" })) : (_jsxs(MenuItem, { component: "label", children: ["Open File", _jsx("input", { type: "file", accept: ".kdbx,application/octet-stream", hidden: true, onChange: async (e) => {
                                            handleMenuClose();
                                            const file = e.target.files?.[0];
                                            if (file)
                                                await handleMobileFile(file);
                                        } })] })), _jsx(MenuItem, { onClick: () => { handleMenuClose(); reopenLast(); }, children: "Recents" }), _jsx(MenuItem, { onClick: () => { handleMenuClose(); createNewVault(); }, children: "New Vault" }), _jsx(Divider, {}), hasFilePicker() ? (_jsx(MenuItem, { onClick: () => { handleMenuClose(); doSave(); }, disabled: !db || !handle || !dirty, children: "Save" })) : (_jsx(MenuItem, { onClick: () => { handleMenuClose(); saveAsDownload(); }, disabled: !db || !dirty, children: "Save As" })), db && (_jsx(MenuItem, { onClick: () => { handleMenuClose(); handleAddEntry(); }, children: "Add Entry" })), db && (_jsx(MenuItem, { onClick: () => { handleMenuClose(); lockNow("Locked manually"); }, children: "Lock Vault" })), canInstall && (_jsx(MenuItem, { onClick: async () => {
                                    handleMenuClose();
                                    const res = await triggerInstall();
                                    if (res === "accepted")
                                        setStatus("App installed");
                                }, children: "Install App" })), !canInstall && isIOS() && !isStandaloneIOS() && (_jsx(MenuItem, { onClick: () => { handleMenuClose(); setShowIOSHelp(true); }, children: "iOS Install Info" }))] })] })), db && (_jsx(TextField, { variant: "outlined", size: "small", placeholder: "Search...", value: q, onChange: (e) => setQ(e.target.value), sx: {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderRadius: 1,
                    input: { color: 'white', py: 0.5 },
                    fieldset: { border: 'none' },
                    width: { xs: 120, sm: 200, md: 250 },
                    ml: 1
                } })), db && !isMobile && (_jsx(FormControl, { variant: "standard", sx: { ml: 1, minWidth: 60 }, children: _jsxs(Select, { value: autoLockMins, onChange: (e) => setAutoLockMins(Number(e.target.value)), sx: { color: 'inherit', '&:before': { borderBottomColor: 'white' }, '& svg': { color: 'white' } }, children: [_jsx(MenuItem, { value: 1, children: "1m" }), _jsx(MenuItem, { value: 5, children: "5m" }), _jsx(MenuItem, { value: 15, children: "15m" })] }) }))] }));
    return (_jsx(ThemeProvider, { theme: theme, children: _jsxs(Layout, { title: "One Saavi", status: status, toolbarActions: toolbarActions, sidebar: db ? (_jsx(GroupTree, { tree: groupTree, selectedId: selectedGroupId, onSelect: (id) => { setSelectedGroupId(id); noteActivity(); } })) : null, children: [db ? (_jsxs(_Fragment, { children: [_jsx(Box, { sx: { mb: 2 } }), _jsx(Box, { className: "table-wrap", children: _jsx(EntryList, { entries: filteredEntries, onReveal: revealPassword, onCopy: copyAndClear, onOpen: (id) => { setOpenedEntryId(id); noteActivity(); } }) }), _jsxs(Drawer, { anchor: "right", open: !!selectedEntry, onClose: () => { setOpenedEntryId(null); noteActivity(); }, sx: {
                                zIndex: (theme) => theme.zIndex.drawer,
                                '& .MuiDrawer-paper': {
                                    width: { xs: '100%', sm: 400, md: 500 },
                                    boxSizing: 'border-box',
                                }
                            }, children: [_jsx(Toolbar, {}), _jsx(Box, { sx: { p: 2, height: '100%', overflowY: 'auto' }, children: selectedEntry && (_jsx(EntryView, { entry: selectedEntry, onChange: markDirty, onClose: () => { setOpenedEntryId(null); noteActivity(); }, onSave: async () => { await doSave(); setOpenedEntryId(null); noteActivity(); }, onCopy: copyAndClear })) })] })] })) : (_jsxs(Box, { sx: { textAlign: 'center', mt: 10, opacity: 0.6 }, children: [_jsx("h2", { children: "Open a KeePass database to start" }), _jsx(Typography, { variant: "caption", sx: {
                                position: 'fixed',
                                bottom: 20,
                                left: 0,
                                width: '100%',
                                textAlign: 'center',
                                opacity: 0.3,
                                fontFamily: 'monospace'
                            }, children: "* SamLabs *" })] })), _jsx(UnlockDialog, { open: unlockOpen, onCancel: () => { setUnlockOpen(false); setPendingBytes(null); }, onUnlock: handleUnlock }), showIOSHelp && (_jsx("div", { style: {
                        position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 9999,
                        display: "grid", placeItems: "center"
                    }, onClick: () => setShowIOSHelp(false), children: _jsxs("div", { style: { background: "#222", color: "#fff", padding: 24, borderRadius: 8, maxWidth: 400 }, onClick: e => e.stopPropagation(), children: [_jsx("h3", { children: "Install on iOS" }), _jsxs("ol", { style: { lineHeight: 1.6 }, children: [_jsx("li", { children: "Open in Safari" }), _jsx("li", { children: "Tap Share" }), _jsx("li", { children: "Add to Home Screen" })] }), _jsx(Button, { onClick: () => setShowIOSHelp(false), children: "Close" })] }) }))] }) }));
}
