import React, { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onCancel: () => void;
  onCreate: (data: { title: string; username: string; password: string; url: string; notes: string }) => void;
};

export default function NewEntryDialog({ open, onCancel, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [reveal, setReveal] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(""); setUsername(""); setPassword(""); setUrl(""); setNotes(""); setReveal(false);
    const t = setTimeout(() => firstRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    onCreate({ title, username, password, url, notes });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "grid", placeItems: "center", zIndex: 60 }}
      onClick={onCancel}
    >
      <form
        autoComplete="off"
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", padding: 16, borderRadius: 8, minWidth: 320, boxShadow: "0 8px 30px rgba(0,0,0,.12)" }}
      >
        <h3 style={{ marginTop: 0 }}>New entry</h3>

        <label style={{ display: "block", marginTop: 8 }}>
          <div>Title</div>
          <input ref={firstRef} name="ne-title" autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label style={{ display: "block", marginTop: 8 }}>
          <div>User name</div>
          <input
            name="ne-user" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            value={username} onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label style={{ display: "block", marginTop: 8 }}>
          <div>Password</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              name="ne-pass" type={reveal ? "text" : "password"}
              autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => setReveal((v) => !v)}>{reveal ? "Hide" : "Show"}</button>
          </div>
        </label>

        <label style={{ display: "block", marginTop: 8 }}>
          <div>URL</div>
          <input name="ne-url" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>

        <label style={{ display: "block", marginTop: 8 }}>
          <div>Notes</div>
          <textarea name="ne-notes" autoComplete="off" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit">Create</button>
        </div>
      </form>
    </div>
  );
}
