import { createTheme } from "@mui/material/styles";
const theme = createTheme({
    palette: {
        mode: "dark",
        primary: {
            main: "#42a5f5", // Blue 400 - Good visibility on dark
        },
        secondary: {
            main: "#ff4081",
        },
        background: {
            default: "#1e1e2d", // Dark blue-grey similar to MudBlazor
            paper: "#2a2a40",
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: "2rem", fontWeight: 600 },
        h2: { fontSize: "1.5rem", fontWeight: 500 },
        h3: { fontSize: "1.25rem", fontWeight: 500 },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: "none",
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: "#27272f",
                },
            },
        },
    },
});
export default theme;
