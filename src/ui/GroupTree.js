import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { List, ListItemButton, ListItemIcon, ListItemText, Collapse, Box } from "@mui/material";
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
export default function GroupTree({ tree, selectedId, onSelect, defaultCollapsed = true }) {
    const [open, setOpen] = useState(() => new Set());
    // open root at least
    const rootId = useMemo(() => tree?.id ?? "", [tree]);
    useMemo(() => {
        if (!rootId)
            return;
        setOpen((s) => {
            const n = new Set(s);
            n.add(rootId);
            return n;
        });
    }, [rootId]);
    if (!tree)
        return null;
    function toggle(id, e) {
        e.stopPropagation();
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
        const isSelected = selectedId === node.id;
        return (_jsxs(_Fragment, { children: [_jsxs(ListItemButton, { selected: isSelected, onClick: () => onSelect(node.id), sx: { pl: depth * 2 + 2, py: 0.5 }, children: [_jsx(ListItemIcon, { sx: { minWidth: 32 }, children: isOpen ? _jsx(FolderOpenIcon, { color: "primary", fontSize: "small" }) : _jsx(FolderIcon, { color: "disabled", fontSize: "small" }) }), _jsx(ListItemText, { primary: node.name, secondary: node.count > 0 ? `${node.count} items` : null, primaryTypographyProps: { fontSize: '0.9rem', fontWeight: isSelected ? 600 : 400 }, secondaryTypographyProps: { fontSize: '0.75rem' } }), hasKids && (_jsx(Box, { onClick: (e) => toggle(node.id, e), sx: { p: 0.5, borderRadius: '50%', '&:hover': { bgcolor: 'action.hover' } }, children: isOpen ? _jsx(ExpandLess, { fontSize: "small" }) : _jsx(ExpandMore, { fontSize: "small" }) }))] }), hasKids && (_jsx(Collapse, { in: isOpen, timeout: "auto", unmountOnExit: true, children: _jsx(List, { component: "div", disablePadding: true, children: node.children.map((c) => (_jsx(Item, { node: c, depth: depth + 1 }, c.id))) }) }))] }));
    }
    return (_jsxs(Box, { sx: { width: '100%', maxWidth: 360, bgcolor: 'background.paper' }, children: [_jsxs(ListItemButton, { onClick: () => onSelect(null), selected: selectedId === null, sx: { mb: 1 }, children: [_jsx(ListItemIcon, { sx: { minWidth: 32 }, children: _jsx(Inventory2OutlinedIcon, { fontSize: "small" }) }), _jsx(ListItemText, { primary: "All Items" })] }), _jsx(List, { component: "nav", "aria-label": "main mailbox folders", disablePadding: true, children: _jsx(Item, { node: tree, depth: 0 }) })] }));
}
