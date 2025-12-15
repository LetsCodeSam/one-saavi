import React, { ReactNode, useState } from "react";
import {
    AppBar,
    Box,
    CssBaseline,
    Drawer,
    IconButton,
    Toolbar,
    Typography,
    useMediaQuery,
    useTheme,
    Stack,
    Chip
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const DRAWER_WIDTH = 280;

interface LayoutProps {
    title: string;
    status?: string;
    sidebar?: ReactNode; // Optional now
    children: ReactNode;
    toolbarActions?: ReactNode;
}

export default function Layout({ title, status, sidebar, children, toolbarActions }: LayoutProps) {
    const theme = useTheme();
    // We only show the menu button if there IS a sidebar to open
    const showDrawer = !!sidebar;
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        if (showDrawer) setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: "flex", minHeight: "100vh" }}>
            <CssBaseline />

            {/* AppBar */}
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    {showDrawer && (
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { md: "none" } }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Stack spacing={0} direction="column" alignItems="flex-start" justifyContent="center" sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap component="div" sx={{ lineHeight: 1.2 }}>
                            {title}
                        </Typography>
                        {status && (
                            <Typography variant="caption" noWrap sx={{ opacity: 0.7, lineHeight: 1 }}>
                                {status}
                            </Typography>
                        )}
                    </Stack>

                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        {toolbarActions}
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Sidebar Drawer Container */}
            {showDrawer && (
                <Box
                    component="nav"
                    sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
                    aria-label="folders"
                >
                    {/* Mobile Drawer */}
                    <Drawer
                        variant="temporary"
                        open={mobileOpen}
                        onClose={handleDrawerToggle}
                        ModalProps={{ keepMounted: true }}
                        sx={{
                            display: { xs: "block", md: "none" },
                            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH },
                        }}
                    >
                        <Toolbar /> {/* Spacer */}
                        {sidebar}
                    </Drawer>

                    {/* Desktop Drawer */}
                    <Drawer
                        variant="permanent"
                        sx={{
                            display: { xs: "none", md: "block" },
                            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH },
                        }}
                        open
                    >
                        <Toolbar /> {/* Spacer */}
                        {sidebar}
                    </Drawer>
                </Box>
            )}

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { md: showDrawer ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
                    overflowX: 'hidden'
                }}
            >
                <Toolbar /> {/* Spacer */}
                {children}
            </Box>
        </Box>
    );
}
