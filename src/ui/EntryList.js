import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function EntryList({ entries, onReveal, onCopy, onOpen }) {
    if (!entries.length)
        return _jsx("p", { children: "No entries." });
    return (_jsxs("table", { style: { width: "100%", marginTop: 16, borderCollapse: "collapse" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }, children: "Title" }), _jsx("th", { style: { textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }, children: "Username" }), _jsx("th", { style: { textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }, children: "URL" }), _jsx("th", { style: { textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }, children: "Actions" })] }) }), _jsx("tbody", { children: entries.map((e) => (_jsxs("tr", { children: [_jsx("td", { style: { padding: 6 }, children: _jsx("a", { href: "#", onClick: (ev) => { ev.preventDefault(); onOpen(e.uuid); }, children: e.title || "(no title)" }) }), _jsx("td", { style: { padding: 6 }, children: e.username || "" }), _jsx("td", { style: { padding: 6 }, children: e.url ? (_jsx("a", { href: e.url, target: "_blank", rel: "noreferrer", children: e.url.replace(/^https?:\/\//, "") })) : "" }), _jsxs("td", { style: { padding: 6, display: "flex", gap: 8 }, children: [_jsx("button", { onClick: async () => {
                                        const pw = await onReveal(e.uuid);
                                        alert(`Password: ${pw}\n\n(it will be cleared from clipboard soon)`);
                                    }, children: "Reveal" }), _jsx("button", { onClick: async () => onCopy(e.username || ""), disabled: !e.username, children: "Copy user" }), _jsx("button", { onClick: async () => {
                                        const pw = await onReveal(e.uuid);
                                        await onCopy(pw);
                                    }, children: "Copy pass" })] })] }, e.uuid))) })] }));
}
