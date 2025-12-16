import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
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
    // Local state for form fields to ensure instant UI feedback (controlled components)
    const [title, setTitle] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [url, setUrl] = useState("");
    const [notes, setNotes] = useState("");
    const getField = (key) => {
        const v = entry?.fields?.get ? entry.fields.get(key) : entry?.fields?.[key];
        return unwrap(v);
    };
    // Sync state from entry when entry changes
    useEffect(() => {
        setTitle(getField("Title"));
        setUsername(getField("UserName"));
        setPassword(getField("Password"));
        setUrl(getField("URL"));
        setNotes(getField("Notes"));
    }, [entry]);
    // Helper to sync local state back to KdbxEntry
    const setField = (key, val) => {
        // 1. Update local state immediately
        if (key === "Title")
            setTitle(val);
        if (key === "UserName")
            setUsername(val);
        if (key === "Password")
            setPassword(val);
        if (key === "URL")
            setUrl(val);
        if (key === "Notes")
            setNotes(val);
        // 2. Update the underlying KDBX object
        if (!entry.fields)
            return;
        if (typeof entry.fields.set === 'function') {
            entry.fields.set(key, val);
        }
        else {
            entry.fields[key] = val;
        }
        // 3. Mark app as dirty
        onChange();
    };
    return (_jsxs(Card, { elevation: 3, children: [_jsx(CardHeader, { title: "Entry Details", action: _jsx(IconButton, { onClick: onClose, children: _jsx(CloseIcon, {}) }) }), _jsx(Divider, {}), _jsx(CardContent, { children: _jsxs(Stack, { spacing: 2, children: [_jsx(TextField, { label: "Title", fullWidth: true, variant: "outlined", value: title, onChange: (e) => setField("Title", e.target.value) }), _jsxs(Grid, { container: true, spacing: 2, children: [_jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "Username", fullWidth: true, value: username, onChange: (e) => setField("UserName", e.target.value), InputProps: {
                                            endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => onCopy(username), edge: "end", children: _jsx(ContentCopyIcon, { fontSize: "small" }) }) }))
                                        } }) }), _jsx(Grid, { size: { xs: 12, md: 6 }, children: _jsx(TextField, { label: "Password", fullWidth: true, type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setField("Password", e.target.value), InputProps: {
                                            endAdornment: (_jsxs(InputAdornment, { position: "end", children: [_jsx(IconButton, { "aria-label": "toggle password visibility", onClick: () => setShowPassword(!showPassword), edge: "end", children: showPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }), _jsx(IconButton, { onClick: () => onCopy(password), edge: "end", children: _jsx(ContentCopyIcon, { fontSize: "small" }) })] }))
                                        } }) })] }), _jsx(TextField, { label: "URL", fullWidth: true, value: url, onChange: (e) => setField("URL", e.target.value), InputProps: {
                                endAdornment: url ? (_jsx(InputAdornment, { position: "end", children: _jsx(Button, { variant: "text", size: "small", component: "a", href: url, target: "_blank", rel: "noreferrer", children: "Open" }) })) : undefined
                            } }), _jsx(TextField, { label: "Notes", fullWidth: true, multiline: true, minRows: 3, value: notes, onChange: (e) => setField("Notes", e.target.value) })] }) }), _jsxs(CardActions, { sx: { justifyContent: 'flex-end', p: 2, gap: 1 }, children: [_jsx(Button, { onClick: onClose, variant: "outlined", color: "inherit", children: "Close" }), _jsx(Button, { onClick: onSave, variant: "contained", color: "primary", children: "Save & Close" })] })] }));
}
