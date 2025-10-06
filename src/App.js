import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { pickKdbx, ensurePerm, readBytes, writeBytes } from "./fs/fileAccess";
import { openKdbx, saveKdbx } from "./crypto/keepass";
import EntryList from "./ui/EntryList";
import EntryView from "./ui/EntryView";
import GroupTree from "./ui/GroupTree";
import UnlockDialog from "./ui/UnlockDialog";
import { saveVaultBytes } from "./fs/mobileStore";
import { setupPWAInstall, triggerInstall } from "./pwa/install";
import { isIOS, isStandaloneIOS } from "./pwa/ios";
import "./app.css";
import { addNewEntry } from "./crypto/keepass";
import { rememberHandle } from "./fs/recents";
import { createNewDb } from "./crypto/keepass";
// ---------- helpers ----------
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
// ---------- component ----------
export default function App() {
    const [db, setDb] = useState(null);
    const [handle, setHandle] = useState(null);
    const [status, setStatus] = useState("Ready");
    const [fileName, setFileName] = useState("");
    const [dirty, setDirty] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [openedEntryId, setOpenedEntryId] = useState(null);
    const [unlockOpen, setUnlockOpen] = useState(false);
    const [pendingBytes, setPendingBytes] = useState(null);
    const [q, setQ] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const clipboardTicker = useRef(null);
    // ---- Auto-lock state ----
    const [autoLockMins, setAutoLockMins] = useState(5);
    const idleTimer = useRef(null);
    const lastVisibleAt = useRef(Date.now());
    // ---- PWA install state ----
    const [canInstall, setCanInstall] = useState(false);
    useEffect(() => {
        setupPWAInstall(setCanInstall);
    }, []);
    // New Database
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
                // Let user choose where to save it
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
                // Mobile: download new file
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
    // iOS helper modal
    const [showIOSHelp, setShowIOSHelp] = useState(false);
    // ----- Auto-lock helpers -----
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
    function lockNow(reason = "Locked") {
        if (!db)
            return;
        setDb(null);
        setSelectedGroupId(null);
        setOpenedEntryId(null);
        setQ("");
        setDirty(false);
        setUnlockOpen(false);
        setDrawerOpen(false);
        clearIdleTimer();
        setStatus(reason);
        try {
            navigator.clipboard.writeText(" ");
            navigator.clipboard.writeText("");
        }
        catch { }
    }
    if (clipboardTicker.current != null) {
        clearInterval(clipboardTicker.current);
        clipboardTicker.current = null;
    }
    useEffect(() => {
        return () => {
            if (clipboardTicker.current != null) {
                clearInterval(clipboardTicker.current);
                clipboardTicker.current = null;
            }
        };
    }, []);
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
    // ---- NEW DATABASE
    _jsx("button", { onClick: createNewVault, title: "Create a new KDBX vault", children: "New vault" });
    // ----- NEW ENTRY -----
    async function handleNewEntry() {
        if (!db)
            return;
        // pick group: selected or root
        const groupRef = (function findGroupById(g, id) {
            if (!id)
                return rootGroup;
            if (g.uuid?.id === id)
                return g;
            for (const x of g.groups || []) {
                const hit = findGroupById(x, id);
                if (hit)
                    return hit;
            }
            return rootGroup;
        })(rootGroup, selectedGroupId);
        const en = addNewEntry(db, groupRef, { title: "New Entry" });
        setDirty(true);
        // open it for editing
        setOpenedEntryId(en.uuid.id);
        setStatus("New entry created (unsaved)");
        noteActivity?.();
    }
    // -- REOPEN LAST DATABSE
    // ----- OPEN / SAVE -----
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
        }
        catch (e) {
            setStatus(e?.message || "Open failed");
        }
    }
    async function doSave() {
        if (!db || !handle)
            return;
        try {
            const out = await saveKdbx(db);
            await writeBytes(handle, out);
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
            setStatus("Saved (download)");
        }
        catch (e) {
            setStatus(e?.message || "Save failed");
        }
    }
    // ----- UNLOCK -----
    async function handleUnlock(password, keyFile) {
        if (!pendingBytes)
            return;
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
        }
        catch (e) {
            setStatus(e?.message || "Unlock failed");
        }
        finally {
            setPendingBytes(null);
        }
    }
    // ----- ROOT GROUP -----
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
    }, [db]);
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
    }, [rootGroup]);
    // ----- ENTRIES -----
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
    }, [db, rootGroup, selectedGroupId]);
    const filteredEntries = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s)
            return entries;
        return entries.filter((e) => (e.title || "").toLowerCase().includes(s) ||
            (e.username || "").toLowerCase().includes(s) ||
            (e.url || "").toLowerCase().includes(s));
    }, [entries, q]);
    const selectedEntry = useMemo(() => entries.find((e) => e.uuid === openedEntryId)?._ref, [entries, openedEntryId]);
    // ----- actions -----
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
        // stop any previous ticker
        if (clipboardTicker.current != null) {
            clearInterval(clipboardTicker.current);
            clipboardTicker.current = null;
        }
        await navigator.clipboard.writeText(text);
        let secs = Math.max(1, Math.round(ms / 1000));
        setStatus(`Copied (clears in ${secs}s)`);
        clipboardTicker.current = window.setInterval(() => {
            secs -= 1;
            if (secs > 0) {
                setStatus(`Copied (clears in ${secs}s)`);
            }
            else {
                if (clipboardTicker.current != null) {
                    clearInterval(clipboardTicker.current);
                    clipboardTicker.current = null;
                }
                // best-effort wipe
                try {
                    navigator.clipboard.writeText(" ");
                    navigator.clipboard.writeText("");
                }
                catch { }
                setStatus("Clipboard cleared");
            }
        }, 1000);
    }
    function markDirty() { setDirty(true); setStatus("Edited"); noteActivity(); }
    // ---------- UI ----------
    return (_jsxs("div", { style: { maxWidth: 1100, margin: "1.5rem auto", fontFamily: "ui-sans-serif" }, children: [_jsx("h1", { style: { fontSize: 28, fontWeight: 700 }, children: "One Saavi" }), _jsxs("p", { style: { opacity: 0.8 }, children: ["Status: ", status, fileName ? ` • ${fileName}` : "", dirty ? " • Dirty" : ""] }), _jsxs("div", { className: "topbar", style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [db && (_jsx("button", { className: "mobile-only", onClick: () => setDrawerOpen(true), "aria-label": "Open groups", children: "\u2630 Groups" })), _jsx("button", { onClick: doOpen, children: "Open .kdbx" }), _jsx("button", { onClick: doSave, disabled: !db || !handle || !dirty, children: "Save" }), !hasFilePicker() && (_jsxs(_Fragment, { children: [_jsxs("label", { style: { border: "1px solid #ccc", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }, children: [_jsx("input", { type: "file", accept: ".kdbx", style: { display: "none" }, onChange: async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file)
                                                await handleMobileFile(file);
                                        } }), "Open (mobile)"] }), _jsx("button", { onClick: saveAsDownload, disabled: !db || !dirty, children: "Save As (.kdbx)" })] })), db && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => lockNow("Locked manually"), children: "Lock now" }), _jsxs("label", { style: { display: "inline-flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { children: "Auto-lock (mins)" }), _jsxs("select", { value: autoLockMins, onChange: (e) => setAutoLockMins(Number(e.target.value)), children: [_jsx("option", { value: 1, children: "1" }), _jsx("option", { value: 3, children: "3" }), _jsx("option", { value: 5, children: "5" }), _jsx("option", { value: 10, children: "10" }), _jsx("option", { value: 15, children: "15" }), _jsx("option", { value: 30, children: "30" })] })] })] })), db && (_jsx("input", { className: "toolbar-search", placeholder: "Search title, username, or URL\u2026", value: q, onChange: (e) => setQ(e.target.value), style: { padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6 } })), db && (_jsx("button", { onClick: handleNewEntry, title: "Create a new entry in the current group", children: "New" })), canInstall && (_jsx("button", { onClick: async () => {
                            const res = await triggerInstall();
                            if (res === "accepted")
                                setStatus("App installed");
                            else if (res === "dismissed")
                                setStatus("Install dismissed");
                        }, title: "Install this app", children: "Install app" })), !canInstall && isIOS() && !isStandaloneIOS() && (_jsx("button", { onClick: () => setShowIOSHelp(true), title: "Add to Home Screen on iOS", children: "Install on iOS" }))] }), db && (_jsxs("div", { className: "app-grid", children: [drawerOpen && _jsx("div", { className: "drawer-backdrop mobile-only", onClick: () => setDrawerOpen(false) }), _jsxs("aside", { className: `sidebar ${drawerOpen ? "open" : ""}`, children: [_jsx("h3", { children: "Groups" }), _jsx(GroupTree, { tree: groupTree, selectedId: selectedGroupId, onSelect: (id) => { setSelectedGroupId(id); setDrawerOpen(false); noteActivity(); } })] }), _jsxs("main", { className: "main", children: [_jsxs("h2", { children: ["Entries ", q ? `(${filteredEntries.length})` : `(${entries.length})`] }), _jsx("div", { className: "table-wrap", children: _jsx(EntryList, { entries: filteredEntries, onReveal: revealPassword, onCopy: copyAndClear, onOpen: (id) => { setOpenedEntryId(id); noteActivity(); } }) }), selectedEntry && (_jsx("div", { style: { marginTop: 20 }, children: _jsx(EntryView, { entry: selectedEntry, onChange: markDirty, onClose: () => { setOpenedEntryId(null); noteActivity(); }, onCopy: copyAndClear }) }))] })] })), _jsx(UnlockDialog, { open: unlockOpen, onCancel: () => { setUnlockOpen(false); setPendingBytes(null); }, onUnlock: handleUnlock }), showIOSHelp && (_jsx("div", { style: {
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,.4)",
                    display: "grid",
                    placeItems: "center",
                    zIndex: 100
                }, onClick: () => setShowIOSHelp(false), children: _jsxs("div", { style: { background: "#fff", padding: 16, borderRadius: 8, maxWidth: 420 }, onClick: (e) => e.stopPropagation(), children: [_jsx("h3", { style: { marginTop: 0 }, children: "Install on iOS" }), _jsxs("ol", { style: { lineHeight: 1.6 }, children: [_jsxs("li", { children: ["Open this site in ", _jsx("strong", { children: "Safari" }), "."] }), _jsxs("li", { children: ["Tap the ", _jsx("strong", { children: "Share" }), " icon (square with an up arrow)."] }), _jsxs("li", { children: ["Scroll and tap ", _jsx("strong", { children: "Add to Home Screen" }), "."] }), _jsxs("li", { children: ["Tap ", _jsx("strong", { children: "Add" }), ". Launch from the new home screen icon."] })] }), _jsx("p", { style: { fontSize: 14, opacity: .8, marginTop: 8 }, children: "Tip: On iOS, Chrome/Edge also rely on Safari\u2019s engine and don\u2019t show a native install prompt. Use Safari for Add to Home Screen." }), _jsx("div", { style: { textAlign: "right" }, children: _jsx("button", { onClick: () => setShowIOSHelp(false), children: "Close" }) })] }) }))] }));
}
