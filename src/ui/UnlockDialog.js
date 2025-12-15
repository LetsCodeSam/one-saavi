import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, IconButton, InputAdornment, Typography, Stack } from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import KeyIcon from '@mui/icons-material/Key';
import UploadFileIcon from '@mui/icons-material/UploadFile';
export default function UnlockDialog({ open, onCancel, onUnlock }) {
    const [pw, setPw] = useState("");
    const [reveal, setReveal] = useState(false);
    const [keyFile, setKeyFile] = useState(undefined);
    // Anti-autofill random name
    const [pwName] = useState(() => "pw_" + Math.random().toString(36).slice(2));
    // Reset dialog each time it opens
    useEffect(() => {
        if (!open)
            return;
        setPw("");
        setReveal(false);
        setKeyFile(undefined);
    }, [open]);
    function submit(e) {
        if (e)
            e.preventDefault();
        if (pw)
            onUnlock(pw, keyFile);
    }
    return (_jsxs(Dialog, { open: open, onClose: onCancel, maxWidth: "xs", fullWidth: true, children: [_jsx(DialogTitle, { children: "Unlock Vault" }), _jsx(DialogContent, { children: _jsxs("form", { onSubmit: submit, style: { marginTop: 8 }, children: [_jsxs(Stack, { spacing: 3, children: [_jsx(TextField, { autoFocus: true, label: "Master Password", type: reveal ? "text" : "password", fullWidth: true, variant: "outlined", value: pw, onChange: (e) => setPw(e.target.value), onKeyDown: (e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            submit();
                                        }
                                    }, name: pwName, autoComplete: "off", inputProps: {
                                        autoComplete: "one-time-code",
                                        form: { autocomplete: 'off' },
                                        "data-lpignore": "true", // LastPass
                                        "data-form-type": "other",
                                        "data-1p-ignore": "true", // 1Password
                                    }, InputProps: {
                                        startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(KeyIcon, { color: "action" }) })),
                                        endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { "aria-label": "toggle password visibility", onClick: () => setReveal(!reveal), edge: "end", children: reveal ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) }))
                                    } }), _jsxs(Box, { children: [_jsx(Typography, { variant: "body2", gutterBottom: true, children: "Key File (Optional)" }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [_jsxs(Button, { variant: "outlined", component: "label", startIcon: _jsx(UploadFileIcon, {}), size: "small", children: ["Select File", _jsx("input", { type: "file", hidden: true, accept: ".key", onChange: (e) => setKeyFile(e.target.files?.[0] || undefined) })] }), keyFile && (_jsx(Typography, { variant: "caption", noWrap: true, sx: { maxWidth: 200 }, children: keyFile.name }))] })] })] }), _jsx("input", { type: "submit", hidden: true })] }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onCancel, children: "Cancel" }), _jsx(Button, { onClick: () => submit(), variant: "contained", disabled: !pw, children: "Unlock" })] })] }));
}
// Helper Box component since we used it
import { Box } from "@mui/material";
