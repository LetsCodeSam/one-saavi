import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
function Item({ node, selectedId, onSelect, depth }) {
    return (_jsxs("div", { children: [_jsxs("button", { onClick: () => onSelect(node.id), style: {
                    padding: "4px 6px",
                    marginLeft: depth * 12,
                    width: "100%",
                    textAlign: "left",
                    background: selectedId === node.id ? "#eef2ff" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 6
                }, title: `${node.name} (${node.count})`, children: [node.name, " ", _jsxs("span", { style: { opacity: .6 }, children: ["(", node.count, ")"] })] }), node.children.map(c => (_jsx(Item, { node: c, selectedId: selectedId, onSelect: onSelect, depth: depth + 1 }, c.id)))] }));
}
export default function GroupTree({ tree, selectedId, onSelect }) {
    if (!tree)
        return null;
    return (_jsxs("div", { style: { padding: 8 }, children: [_jsx("button", { onClick: () => onSelect(null), style: { marginBottom: 8 }, children: "All Items" }), _jsx(Item, { node: tree, selectedId: selectedId, onSelect: onSelect, depth: 0 })] }));
}
