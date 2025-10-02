import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { pickKdbx, ensurePerm, readBytes, writeBytes } from "./fs/fileAccess";
import { openKdbx, saveKdbx } from "./crypto/keepass";
import EntryList from "./ui/EntryList";
import EntryView from "./ui/EntryView";
import GroupTree from "./ui/GroupTree";
import UnlockDialog from "./ui/UnlockDialog";
import { saveVaultBytes } from "./fs/mobileStore";
import "./app.css"; // responsive/mobile styles
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
    // selection
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [openedEntryId, setOpenedEntryId] = useState(null);
    // unlock dialog plumbing
    const [unlockOpen, setUnlockOpen] = useState(false);
    const [pendingBytes, setPendingBytes] = useState(null);
    // search query
    const [q, setQ] = useState("");
    // mobile drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    // ---- Auto-lock timer ----
    const [autoLockMins, setAutoLockMins] = useState(5); // default 5 minutes
    const idleTimer = useRef(null);
    const lastVisibleAt = useRef(Date.now());
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
        // Any user activity resets the timer if a DB is open
        if (!db)
            return;
        scheduleIdleTimer();
    }
    function onVisibilityChange() {
        if (document.visibilityState === "visible") {
            // If we were hidden longer than timeout, lock immediately
            const hiddenForMs = Date.now() - lastVisibleAt.current;
            if (hiddenForMs >= autoLockMins * 60000 && db) {
                lockNow("Auto-locked while tab was hidden");
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
        // Do not save automatically; just forget decrypted DB
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
        // Optional: wipe clipboard once on lock (best-effort)
        try {
            navigator.clipboard.writeText(" ");
            navigator.clipboard.writeText("");
        }
        catch { }
    }
    // Hook up global activity listeners
    useEffect(() => {
        const act = () => noteActivity();
        window.addEventListener("pointerdown", act, { passive: true });
        window.addEventListener("keydown", act);
        window.addEventListener("touchstart", act, { passive: true });
        window.addEventListener("mousemove", act, { passive: true });
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            window.removeEventListener("pointerdown", act);
            window.removeEventListener("keydown", act);
            window.removeEventListener("touchstart", act);
            window.removeEventListener("mousemove", act);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, autoLockMins]);
    // Reschedule when autolock setting changes or when db opens/closes
    useEffect(() => {
        if (db)
            scheduleIdleTimer();
        else
            clearIdleTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, autoLockMins]);
    // ----- OPEN (desktop) -----
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
        }
        catch (e) {
            setStatus(e?.message || "Open failed");
        }
    }
    // ----- SAVE (desktop) -----
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
    // ----- MOBILE fallback -----
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
            // start idle timer after a successful unlock
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
        const fallback = db.getDefaultGroup?.() ?? db.groups?.[0] ?? null;
        return found || fallback;
    }, [db]);
    // ----- GROUP TREE -----
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
            const hit = g.uuid?.id === id;
            if (hit) {
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
    // ----- FILTERED entries -----
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
        await navigator.clipboard.writeText(text);
        setStatus(`Copied (clears in ${ms / 1000}s)`);
        setTimeout(async () => {
            try {
                await navigator.clipboard.writeText("");
            }
            catch { }
            setStatus("Clipboard cleared");
        }, ms);
        noteActivity(); // copying counts as activity
    }
    function markDirty() { setDirty(true); setStatus("Edited"); noteActivity(); }
    // ---------- UI ----------
    return (_jsxs("div", { style: { maxWidth: 1100, margin: "1.5rem auto", fontFamily: "ui-sans-serif" }, children: [_jsx("h1", { style: { fontSize: 28, fontWeight: 700 }, children: "One Saavi" }), _jsxs("p", { style: { opacity: 0.8 }, children: ["Status: ", status, fileName ? ` • ${fileName}` : "", dirty ? " • Dirty" : ""] }), _jsxs("div", { className: "topbar", style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [db && (_jsx("button", { className: "mobile-only", onClick: () => setDrawerOpen(true), "aria-label": "Open groups", children: "\u2630 Groups" })), _jsx("button", { onClick: doOpen, children: "Open .kdbx" }), _jsx("button", { onClick: doSave, disabled: !db || !handle || !dirty, children: "Save" }), !hasFilePicker() && (_jsxs(_Fragment, { children: [_jsxs("label", { style: { border: "1px solid #ccc", padding: "6px 10px", borderRadius: 6, cursor: "pointer" }, children: [_jsx("input", { type: "file", accept: ".kdbx", style: { display: "none" }, onChange: async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file)
                                                await handleMobileFile(file);
                                        } }), "Open (mobile)"] }), _jsx("button", { onClick: saveAsDownload, disabled: !db || !dirty, children: "Save As (.kdbx)" })] })), db && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => lockNow("Locked manually"), children: "Lock now" }), _jsxs("label", { style: { display: "inline-flex", alignItems: "center", gap: 6 }, children: [_jsx("span", { children: "Auto-lock (mins)" }), _jsxs("select", { value: autoLockMins, onChange: (e) => setAutoLockMins(Number(e.target.value)), children: [_jsx("option", { value: 1, children: "1" }), _jsx("option", { value: 3, children: "3" }), _jsx("option", { value: 5, children: "5" }), _jsx("option", { value: 10, children: "10" }), _jsx("option", { value: 15, children: "15" }), _jsx("option", { value: 30, children: "30" })] })] })] })), db && (_jsx("input", { className: "toolbar-search", placeholder: "Search title, username, or URL\u2026", value: q, onChange: (e) => setQ(e.target.value), style: { padding: "6px 10px", border: "1px solid #ccc", borderRadius: 6 } }))] }), db && (_jsxs("div", { className: "app-grid", children: [drawerOpen && _jsx("div", { className: "drawer-backdrop mobile-only", onClick: () => setDrawerOpen(false) }), _jsxs("aside", { className: `sidebar ${drawerOpen ? "open" : ""}`, children: [_jsx("h3", { children: "Groups" }), _jsx(GroupTree, { tree: groupTree, selectedId: selectedGroupId, onSelect: (id) => { setSelectedGroupId(id); setDrawerOpen(false); noteActivity(); } })] }), _jsxs("main", { className: "main", children: [_jsxs("h2", { children: ["Entries ", q ? `(${filteredEntries.length})` : `(${entries.length})`] }), _jsx("div", { className: "table-wrap", children: _jsx(EntryList, { entries: filteredEntries, onReveal: revealPassword, onCopy: copyAndClear, onOpen: (id) => { setOpenedEntryId(id); noteActivity(); } }) }), selectedEntry && (_jsx("div", { style: { marginTop: 20 }, children: _jsx(EntryView, { entry: selectedEntry, onChange: markDirty, onClose: () => { setOpenedEntryId(null); noteActivity(); }, onCopy: copyAndClear }) }))] })] })), _jsx(UnlockDialog, { open: unlockOpen, onCancel: () => { setUnlockOpen(false); setPendingBytes(null); }, onUnlock: handleUnlock })] }));
}
