import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
export default function UnlockDialog({ open, onCancel, onUnlock }) {
    const [pw, setPw] = useState("");
    const [reveal, setReveal] = useState(false);
    const [keyFile, setKeyFile] = useState(undefined);
    const inputRef = useRef(null);
    // Focus password when dialog opens
    useEffect(() => {
        if (!open)
            return;
        const t = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(t);
    }, [open]);
    // ESC to cancel
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onCancel]);
    if (!open)
        return null;
    function submit() {
        if (pw)
            onUnlock(pw, keyFile);
    }
    function onFormSubmit(e) {
        e.preventDefault();
        submit();
    }
    return (_jsx("div", { style: {
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
        }, 
        // prevent background scroll
        onWheel: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation(), children: _jsxs("form", { onSubmit: onFormSubmit, style: {
                background: "#fff",
                padding: 16,
                borderRadius: 8,
                minWidth: 320,
                boxShadow: "0 8px 30px rgba(0,0,0,.12)",
            }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "Unlock vault" }), _jsx("label", { style: { display: "block", margin: "8px 0 4px" }, children: "Master password" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("input", { ref: inputRef, type: reveal ? "text" : "password", value: pw, onChange: (e) => setPw(e.target.value), onKeyDown: (e) => {
                                // Ensure Enter triggers submit on all browsers (incl. iOS)
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    submit();
                                }
                            }, style: { flex: 1, padding: "6px 8px" }, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", autoComplete: "current-password" }), _jsx("button", { type: "button", onClick: () => setReveal((v) => !v), "aria-label": reveal ? "Hide password" : "Show password", children: reveal ? "Hide" : "Show" })] }), _jsx("label", { style: { display: "block", margin: "12px 0 6px" }, children: "Key file (optional)" }), _jsx("input", { type: "file", accept: ".key", onChange: (e) => setKeyFile(e.target.files?.[0] || undefined) }), _jsx("button", { type: "submit", style: { position: "absolute", left: -9999, width: 1, height: 1 }, "aria-hidden": "true", tabIndex: -1, children: "submit" }), _jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }, children: [_jsx("button", { type: "button", onClick: onCancel, children: "Cancel" }), _jsx("button", { type: "submit", disabled: !pw, children: "Unlock" })] })] }) }));
}
