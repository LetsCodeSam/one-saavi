import React, { useMemo, useState } from "react";

function unwrap(val: any): string {
  if (!val) return "";
  return val.getText ? val.getText() : String(val);
}
function getField(entry: any, key: string): string {
  const v = entry?.fields?.get ? entry.fields.get(key) : entry?.fields?.[key];
  return unwrap(v);
}

type Props = {
  entry: any;
  onChange: () => void;
  onClose: () => void;
  onCopy: (text: string) => void;
};

export default function EntryView({ entry, onChange, onClose, onCopy }: Props) {
  const [reveal, setReveal] = useState(false);

  const title = useMemo(() => getField(entry, "Title"), [entry]);
  const user = useMemo(() => getField(entry, "UserName"), [entry]);
  const url = useMemo(() => getField(entry, "URL"), [entry]);
  const notes = useMemo(() => getField(entry, "Notes"), [entry]);

  function setField(key: string, val: string) {
    if (entry?.fields?.set) entry.fields.set(key, val);
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

      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
        <label>
          <div>Title</div>
          <input
            name="ev-title"
            autoComplete="off"
            value={title}
            onChange={(e) => setField("Title", e.target.value)}
          />
        </label>

        <label>
          <div>User name</div>
          <input
            name="ev-user"            /* avoid 'username' */
            autoComplete="off"
            value={user}
            onChange={(e) => setField("UserName", e.target.value)}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>

        <label>
          <div>URL</div>
          <input
            name="ev-url"
            autoComplete="off"
            value={url}
            onChange={(e) => setField("URL", e.target.value)}
          />
        </label>

        <label>
          <div>Password</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              name="ev-pass"          /* avoid 'password' */
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
            <button type="button" onClick={() => onCopy(getPassword())}>
              Copy
            </button>
          </div>
        </label>

        <label>
          <div>Notes</div>
          <textarea
            name="ev-notes"
            autoComplete="off"
            value={notes}
            onChange={(e) => setField("Notes", e.target.value)}
            rows={4}
          />
        </label>
      </div>
    </form>
  );
}
