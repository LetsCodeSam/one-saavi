import React, { useMemo, useState } from "react";
import * as kdbxweb from "kdbxweb";

type Props = {
  entry: any;                 // kdbxweb entry
  onChange: () => void;       // call when edited (to mark dirty)
  onClose?: () => void;
  onCopy?: (t: string) => Promise<void>;
};

function unwrap(v: any): string {
  if (!v) return "";
  return v.getText ? v.getText() : String(v);
}
function getField(en: any, key: string): string {
  const v = en?.fields?.get ? en.fields.get(key) : en?.fields?.[key];
  return unwrap(v);
}
function setField(en: any, key: string, val: string) {
  if (key === "Password") {
    en.fields.set("Password", kdbxweb.ProtectedValue.fromString(val ?? ""));
  } else {
    en.fields.set(key, val ?? "");
  }
  en.times.update();
}

export default function EntryView({ entry, onChange, onClose, onCopy }: Props) {
  const [reveal, setReveal] = useState(false);

  const model = useMemo(
    () => ({
      Title: getField(entry, "Title"),
      UserName: getField(entry, "UserName"),
      URL: getField(entry, "URL"),
      Password: getField(entry, "Password"),
      Notes: getField(entry, "Notes"),
    }),
    [entry]
  );

  return (
    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>Edit entry</strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setReveal((v) => !v)}>{reveal ? "Hide" : "Show"}</button>
          {onClose && <button onClick={onClose}>Close</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr auto", gap: 8, marginTop: 12 }}>
        <label style={{ alignSelf: "center" }}>Title</label>
        <input
          defaultValue={model.Title}
          onChange={(e) => { setField(entry, "Title", e.target.value); onChange(); }}
        />
        <span />

        <label style={{ alignSelf: "center" }}>Username</label>
        <input
          defaultValue={model.UserName}
          onChange={(e) => { setField(entry, "UserName", e.target.value); onChange(); }}
        />
        <button onClick={() => onCopy?.(getField(entry, "UserName"))}>User</button>

        <label style={{ alignSelf: "center" }}>URL</label>
        <input
          defaultValue={model.URL}
          onChange={(e) => { setField(entry, "URL", e.target.value); onChange(); }}
        />
        <a href={model.URL || "#"} target="_blank" rel="noreferrer">Open</a>

        <label style={{ alignSelf: "center" }}>Password</label>
        <input
          type={reveal ? "text" : "password"}
          defaultValue={model.Password}
          onChange={(e) => { setField(entry, "Password", e.target.value); onChange(); }}
        />
        <button onClick={() => onCopy?.(getField(entry, "Password"))}>Pass</button>

        <label style={{ alignSelf: "start", marginTop: 6 }}>Notes</label>
        <textarea
          defaultValue={model.Notes}
          onChange={(e) => { setField(entry, "Notes", e.target.value); onChange(); }}
          rows={6}
          style={{ resize: "vertical" }}
        />
        <span />
      </div>
    </div>
  );
}
