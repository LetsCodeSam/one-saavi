import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Card, CardHeader, CardContent, CardActions, TextField, Button, IconButton, InputAdornment, Grid, Stack, Divider, } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
function unwrap(val) {
    if (!val)
        return "";
    return val.getText ? val.getText() : String(val);
}
export default function EntryView({ entry, onChange, onClose, onSave, onCopy }) {
    // We need local state to handle editing fields properly
    const [showPassword, setShowPassword] = useState(false);
    const [dirty, setDirty] = useState(false);
    // Helper to sync local state back to KdbxEntry
    const setField = (key, val) => {
        if (!entry.fields)
            return;
        // rough heuristic: if we have a proper minimal Kdbx structure
        if (typeof entry.fields.set === 'function') {
            // ProtectedValue vs String handling is tricky in raw JS KdbxWeb
            // For now we just set string. 
            // Real implementation usually needs to check if existing is ProtectedValue.
            entry.fields.set(key, val);
        }
        else {
            entry.fields[key] = val;
        }
        onChange();
    };
    const getField = (key) => {
        const v = entry?.fields?.get ? entry.fields.get(key) : entry?.fields?.[key];
        return unwrap(v);
    };
    const title = getField("Title");
    const username = getField("UserName");
    const password = getField("Password");
    const url = getField("URL");
    const notes = getField("Notes");
    return (_jsxs(Card, { elevation: 3, children: [_jsx(CardHeader, { title: "Entry Details", action: _jsx(IconButton, { onClick: onClose, children: _jsx(CloseIcon, {}) }) }), _jsx(Divider, {}), _jsx(CardContent, { children: _jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { label: "Title", fullWidth: true, variant: "outlined", value: title, onChange: (e) => setField("Title", e.target.value) }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "Username", fullWidth: true, value: username, onChange: (e) => setField("UserName", e.target.value), InputProps: {
                                            endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => onCopy(username), edge: "end", children: _jsx(ContentCopyIcon, { fontSize: "small" }) }) }))
                                        } }) }), _jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "Password", fullWidth: true, type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setField("Password", e.target.value), InputProps: {
                                            endAdornment: (_jsxs(InputAdornment, { position: "end", children: [_jsx(IconButton, { "aria-label": "toggle password visibility", onClick: () => setShowPassword(!showPassword), edge: "end", children: showPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }), _jsx(IconButton, { onClick: () => onCopy(password), edge: "end", children: _jsx(ContentCopyIcon, { fontSize: "small" }) })] }))
                                        } }) })] }), _jsx(TextField, { label: "URL", fullWidth: true, value: url, onChange: (e) => setField("URL", e.target.value), InputProps: {
                                endAdornment: url ? (_jsx(InputAdornment, { position: "end", children: _jsx(Button, { variant: "text", size: "small", component: "a", href: url, target: "_blank", rel: "noreferrer", children: "Open" }) })) : undefined
                            } }), _jsx(TextField, { label: "Notes", fullWidth: true, multiline: true, minRows: 3, value: notes, onChange: (e) => setField("Notes", e.target.value) })] }) }), _jsxs(CardActions, { sx: { justifyContent: 'flex-end', p: 2, gap: 1 }, children: [_jsx(Button, { onClick: onClose, variant: "outlined", color: "inherit", children: "Close" }), _jsx(Button, { onClick: onSave, variant: "contained", color: "primary", children: "Save & Close" })] })] }));
}
