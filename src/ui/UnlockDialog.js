import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
export default function UnlockDialog({ open, onCancel, onUnlock }) {
    const [pw, setPw] = useState("");
    const [reveal, setReveal] = useState(false);
    const [keyFile, setKeyFile] = useState(undefined);
    const inputRef = useRef(null);
    useEffect(() => { if (open)
        setTimeout(() => inputRef.current?.focus(), 0); }, [open]);
    if (!open)
        return null;
    return (_jsx("div", { style: {
            position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
            display: "grid", placeItems: "center", zIndex: 50
        }, children: _jsxs("div", { style: { background: "#fff", padding: 16, borderRadius: 8, minWidth: 320 }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "Unlock vault" }), _jsx("label", { style: { display: "block", margin: "8px 0 4px" }, children: "Master password" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { ref: inputRef, type: reveal ? "text" : "password", value: pw, onChange: (e) => setPw(e.target.value), style: { flex: 1, padding: "6px 8px" }, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" }), _jsx("button", { onClick: () => setReveal(r => !r), children: reveal ? "Hide" : "Show" })] }), _jsx("label", { style: { display: "block", margin: "12px 0 6px" }, children: "Key file (optional)" }), _jsx("input", { type: "file", accept: ".key", onChange: (e) => setKeyFile(e.target.files?.[0] || undefined) }), _jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }, children: [_jsx("button", { onClick: onCancel, children: "Cancel" }), _jsx("button", { onClick: () => onUnlock(pw, keyFile), disabled: !pw, children: "Unlock" })] })] }) }));
}
