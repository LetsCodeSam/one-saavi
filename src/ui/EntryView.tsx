import React, { useMemo, useState } from "react";
import * as kdbxweb from "kdbxweb";

type Props = {
  entry: any;
  onChange: () => void;                 // call when entry fields change
  onClose: () => void;                  // close the editor
  onCopy: (text: string) => void;       // clipboard copy (with your countdown)
};

/* ---------------- helpers ---------------- */
function unwrap(val: any): string {
  if (!val) return "";
  return val.getText ? val.getText() : String(val);
}
function getField(entry: any, key: string): string {
  const v = entry?.fields?.get ? entry.fields.get(key) : entry?.fields?.[key];
  return unwrap(v);
}

/* Randomized field names reduce browser “login form” heuristics */
const rand = () => Math.random().toString(36).slice(2);

export default function EntryView({ entry, onChange, onClose, onCopy }: Props) {
  const [reveal, setReveal] = useState(false);
  const [userNameAttr] = useState(() => "u_" + rand());
  const [passNameAttr] = useState(() => "p_" + rand());
  const [titleNameAttr] = useState(() => "t_" + rand());
  const [urlNameAttr] = useState(() => "l_" + rand());
  const [notesNameAttr] = useState(() => "n_" + rand());

  // read-through values from the entry (parent re-renders onChange)
  const title = useMemo(() => getField(entry, "Title"), [entry]);
  const user = useMemo(() => getField(entry, "UserName"), [entry]);
  const url = useMemo(() => getField(entry, "URL"), [entry]);
  const notes = useMemo(() => getField(entry, "Notes"), [entry]);

  function setField(key: string, val: string) {
    if (!entry?.fields?.set) return;
    if (key === "Password") {
      entry.fields.set("Password", kdbxweb.ProtectedValue.fromString(val ?? ""));
    } else {
      entry.fields.set(key, val ?? "");
    }
    entry.times?.update?.();
    onChange();
  }

  function getPassword(): string {
    const v = entry?.fields?.get ? entry.fields.get("Password") : entry?.fields?.Password;
    return unwrap(v);
  }

  return (
    <form
      autoComplete="off"
      onSubmit={(e) => e.preventDefault()}
      style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{title || "(no title)"}</h3>
        <button type="button" onClick={onClose}>Close</button>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {/* Title */}
        <label>
          <div>Title</div>
          <input
            name={titleNameAttr}
            autoComplete="off"
            value={title}
            onChange={(e) => setField("Title", e.target.value)}
          />
        </label>

        {/* Username (avoid 'username' name) */}
        <label>
          <div>User name</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              name={userNameAttr}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={user}
              onChange={(e) => setField("UserName", e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => onCopy(user || "")}
              title="Copy username"
            >
              User
            </button>
          </div>
        </label>

        {/* URL */}
        <label>
          <div>URL</div>
          <input
            name={urlNameAttr}
            autoComplete="off"
            value={url}
            onChange={(e) => setField("URL", e.target.value)}
          />
        </label>

        {/* Password (avoid 'password' name; anti-autofill) */}
        <label>
          <div>Password</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              name={passNameAttr}
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={getPassword()}
              onChange={(e) => setField("Password", e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => setReveal((v) => !v)}>
              {reveal ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              onClick={() => onCopy(getPassword())}
              title="Copy password"
            >
              Pass
            </button>
          </div>
        </label>

        {/* Notes */}
        <label>
          <div>Notes</div>
          <textarea
            name={notesNameAttr}
            autoComplete="off"
            rows={4}
            value={notes}
            onChange={(e) => setField("Notes", e.target.value)}
          />
        </label>
      </div>
    </form>
  );
}
