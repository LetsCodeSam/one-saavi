import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { AppBar, Box, CssBaseline, Drawer, IconButton, Toolbar, Typography, useTheme, Stack } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
const DRAWER_WIDTH = 280;
export default function Layout({ title, status, sidebar, children, toolbarActions }) {
    const theme = useTheme();
    // We only show the menu button if there IS a sidebar to open
    const showDrawer = !!sidebar;
    const [mobileOpen, setMobileOpen] = useState(false);
    const handleDrawerToggle = () => {
        if (showDrawer)
            setMobileOpen(!mobileOpen);
    };
    return (_jsxs(Box, { sx: { display: "flex", minHeight: "100vh" }, children: [_jsx(CssBaseline, {}), _jsx(AppBar, { position: "fixed", sx: { zIndex: (theme) => theme.zIndex.drawer + 1 }, children: _jsxs(Toolbar, { children: [showDrawer && (_jsx(IconButton, { color: "inherit", "aria-label": "open drawer", edge: "start", onClick: handleDrawerToggle, sx: { mr: 2, display: { md: "none" } }, children: _jsx(MenuIcon, {}) })), _jsxs(Stack, { spacing: 0, direction: "column", alignItems: "flex-start", justifyContent: "center", sx: { flexGrow: 1 }, children: [_jsx(Typography, { variant: "h6", noWrap: true, component: "div", sx: { lineHeight: 1.2 }, children: title }), status && (_jsx(Typography, { variant: "caption", noWrap: true, sx: { opacity: 0.7, lineHeight: 1 }, children: status }))] }), _jsx(Box, { sx: { display: "flex", gap: 1, alignItems: "center" }, children: toolbarActions })] }) }), showDrawer && (_jsxs(Box, { component: "nav", sx: { width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }, "aria-label": "folders", children: [_jsxs(Drawer, { variant: "temporary", open: mobileOpen, onClose: handleDrawerToggle, ModalProps: { keepMounted: true }, sx: {
                            display: { xs: "block", md: "none" },
                            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH },
                        }, children: [_jsx(Toolbar, {}), " ", sidebar] }), _jsxs(Drawer, { variant: "permanent", sx: {
                            display: { xs: "none", md: "block" },
                            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH },
                        }, open: true, children: [_jsx(Toolbar, {}), " ", sidebar] })] })), _jsxs(Box, { component: "main", sx: {
                    flexGrow: 1,
                    p: 3,
                    width: { md: showDrawer ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
                    overflowX: 'hidden'
                }, children: [_jsx(Toolbar, {}), " ", children] })] }));
}
