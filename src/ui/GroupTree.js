import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
export default function GroupTree({ tree, selectedId, onSelect, defaultCollapsed = true }) {
    const [open, setOpen] = useState(() => new Set());
    // open root at least
    const rootId = useMemo(() => tree?.id ?? "", [tree]);
    useMemo(() => {
        if (!rootId)
            return;
        setOpen((s) => {
            const n = new Set(s);
            // root expanded, children collapsed by default
            n.add(rootId);
            return n;
        });
    }, [rootId]);
    if (!tree)
        return null;
    function toggle(id) {
        setOpen((s) => {
            const n = new Set(s);
            if (n.has(id))
                n.delete(id);
            else
                n.add(id);
            return n;
        });
    }
    function Item({ node, depth }) {
        const hasKids = node.children.length > 0;
        const isOpen = open.has(node.id);
        return (_jsxs("div", { children: [_jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [hasKids ? (_jsx("button", { onClick: () => toggle(node.id), "aria-label": isOpen ? "Collapse" : "Expand", title: isOpen ? "Collapse" : "Expand", style: {
                                width: 22, height: 22, marginRight: 4, border: "1px solid #ddd",
                                borderRadius: 4, lineHeight: "20px", background: "#fff", cursor: "pointer"
                            }, children: isOpen ? "▾" : "▸" })) : (_jsx("span", { style: { display: "inline-block", width: 22 } })), _jsxs("button", { onClick: () => onSelect(node.id), style: {
                                padding: "4px 6px",
                                marginLeft: depth * 10,
                                textAlign: "left",
                                background: selectedId === node.id ? "#eef2ff" : "transparent",
                                border: "none",
                                cursor: "pointer",
                                borderRadius: 6
                            }, title: `${node.name} (${node.count})`, children: [node.name, " ", _jsxs("span", { style: { opacity: .6 }, children: ["(", node.count, ")"] })] })] }), hasKids && isOpen && (_jsx("div", { children: node.children.map((c) => (_jsx(Item, { node: c, depth: depth + 1 }, c.id))) }))] }));
    }
    return (_jsxs("div", { style: { padding: 8, maxHeight: "65vh", overflow: "auto" }, children: [_jsx("button", { onClick: () => onSelect(null), style: { marginBottom: 8 }, children: "All Items" }), _jsx(Item, { node: tree, depth: 0 })] }));
}
