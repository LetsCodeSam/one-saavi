import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { pickKdbx, ensurePerm, readBytes, writeBytes } from "./fs/fileAccess";
import { openKdbx, saveKdbx } from "./crypto/keepass";
import EntryList from "./ui/EntryList";
import EntryView from "./ui/EntryView";
import GroupTree from "./ui/GroupTree";
function unwrap(val) { if (!val)
    return ""; return val.getText ? val.getText() : String(val); }
function field(en, key) {
    const v = en?.fields?.get ? en.fields.get(key) : en?.fields?.[key];
    return unwrap(v);
}
export default function App() {
    const [db, setDb] = useState(null);
    const [handle, setHandle] = useState(null);
    const [status, setStatus] = useState("Ready");
    const [fileName, setFileName] = useState("");
    const [dirty, setDirty] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [openedEntryId, setOpenedEntryId] = useState(null);
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
    // Prefer group named "Saavi"; else default group; else first group
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
        const root = found || fallback;
        // debug: verify we picked something
        // console.debug("root group:", root?.uuid?.id, unwrap(root?.name));
        return root;
    }, [db]);
    // Build the tree
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
    // Entries filtered by selected group (null → all under root)
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
    const selectedEntry = useMemo(() => entries.find((e) => e.uuid === openedEntryId)?._ref, [entries, openedEntryId]);
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
        setStatus("Copied to clipboard");
        setTimeout(async () => { try {
            await navigator.clipboard.writeText("");
        }
        catch { } }, ms);
    }
    function markDirty() { setDirty(true); setStatus("Edited"); }
    return (_jsxs("div", { style: { maxWidth: 1100, margin: "1.5rem auto", fontFamily: "ui-sans-serif" }, children: [_jsx("h1", { style: { fontSize: 28, fontWeight: 700 }, children: "One Saavi" }), _jsxs("p", { style: { opacity: 0.8 }, children: ["Status: ", status, fileName ? ` • ${fileName}` : "", dirty ? " • Dirty" : ""] }), _jsxs("div", { style: { display: "flex", gap: 8, marginTop: 12 }, children: [_jsx("button", { onClick: doOpen, children: "Open .kdbx" }), _jsx("button", { onClick: doSave, disabled: !db || !handle || !dirty, children: "Save" })] }), db && (_jsxs("div", { style: { display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, marginTop: 20 }, children: [_jsxs("aside", { style: { borderRight: "1px solid #eee", paddingRight: 8 }, children: [_jsx("h3", { children: "Groups" }), _jsx(GroupTree, { tree: groupTree, selectedId: selectedGroupId, onSelect: setSelectedGroupId })] }), _jsxs("main", { children: [_jsx("h2", { children: "Entries" }), _jsx(EntryList, { entries: entries, onReveal: revealPassword, onCopy: copyAndClear, onOpen: (id) => setOpenedEntryId(id) }), selectedEntry && (_jsx("div", { style: { marginTop: 20 }, children: _jsx(EntryView, { entry: selectedEntry, onChange: markDirty, onClose: () => setOpenedEntryId(null), onCopy: copyAndClear }) }))] })] }))] }));
}
