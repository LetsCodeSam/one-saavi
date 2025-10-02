import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import * as kdbxweb from "kdbxweb";
function unwrap(v) {
    if (!v)
        return "";
    return v.getText ? v.getText() : String(v);
}
function getField(en, key) {
    const v = en?.fields?.get ? en.fields.get(key) : en?.fields?.[key];
    return unwrap(v);
}
function setField(en, key, val) {
    if (key === "Password") {
        en.fields.set("Password", kdbxweb.ProtectedValue.fromString(val ?? ""));
    }
    else {
        en.fields.set(key, val ?? "");
    }
    en.times.update();
}
export default function EntryView({ entry, onChange, onClose, onCopy }) {
    const [reveal, setReveal] = useState(false);
    const model = useMemo(() => ({
        Title: getField(entry, "Title"),
        UserName: getField(entry, "UserName"),
        URL: getField(entry, "URL"),
        Password: getField(entry, "Password"),
        Notes: getField(entry, "Notes"),
    }), [entry]);
    return (_jsxs("div", { style: { padding: 12, border: "1px solid #eee", borderRadius: 8 }, children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [_jsx("strong", { children: "Edit entry" }), _jsxs("div", { style: { display: "flex", gap: 8 }, children: [_jsx("button", { onClick: () => setReveal((v) => !v), children: reveal ? "Hide" : "Show" }), onClose && _jsx("button", { onClick: onClose, children: "Close" })] })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 8, marginTop: 12 }, children: [_jsx("label", { style: { alignSelf: "center" }, children: "Title" }), _jsx("input", { defaultValue: model.Title, onChange: (e) => { setField(entry, "Title", e.target.value); onChange(); } }), _jsx("span", {}), _jsx("label", { style: { alignSelf: "center" }, children: "Username" }), _jsx("input", { defaultValue: model.UserName, onChange: (e) => { setField(entry, "UserName", e.target.value); onChange(); } }), _jsx("button", { onClick: () => onCopy?.(getField(entry, "UserName")), children: "User" }), _jsx("label", { style: { alignSelf: "center" }, children: "URL" }), _jsx("input", { defaultValue: model.URL, onChange: (e) => { setField(entry, "URL", e.target.value); onChange(); } }), _jsx("a", { href: model.URL || "#", target: "_blank", rel: "noreferrer", children: "Open" }), _jsx("label", { style: { alignSelf: "center" }, children: "Password" }), _jsx("input", { type: reveal ? "text" : "password", defaultValue: model.Password, onChange: (e) => { setField(entry, "Password", e.target.value); onChange(); } }), _jsx("button", { onClick: () => onCopy?.(getField(entry, "Password")), children: "Pass" }), _jsx("label", { style: { alignSelf: "start", marginTop: 6 }, children: "Notes" }), _jsx("textarea", { defaultValue: model.Notes, onChange: (e) => { setField(entry, "Notes", e.target.value); onChange(); }, rows: 6, style: { resize: "vertical" } }), _jsx("span", {})] })] }));
}
