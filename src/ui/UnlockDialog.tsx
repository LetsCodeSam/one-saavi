import React, { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onCancel: () => void;
  onUnlock: (password: string, keyFile?: File) => void;
};

export default function UnlockDialog({ open, onCancel, onUnlock }: Props) {
  const [pw, setPw] = useState("");
  const [reveal, setReveal] = useState(false);
  const [keyFile, setKeyFile] = useState<File | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 0); }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "grid", placeItems: "center", zIndex: 50
    }}>
      <div style={{ background: "#fff", padding: 16, borderRadius: 8, minWidth: 320 }}>
        <h3 style={{ marginTop: 0 }}>Unlock vault</h3>
        <label style={{ display: "block", margin: "8px 0 4px" }}>Master password</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            type={reveal ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            style={{ flex: 1, padding: "6px 8px" }}
            placeholder="••••••••"
          />
          <button onClick={() => setReveal(r => !r)}>{reveal ? "Hide" : "Show"}</button>
        </div>

        <label style={{ display: "block", margin: "12px 0 6px" }}>Key file (optional)</label>
        <input type="file" accept=".key"
               onChange={(e)=> setKeyFile(e.target.files?.[0] || undefined)} />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={() => onUnlock(pw, keyFile)} disabled={!pw}>Unlock</button>
        </div>
      </div>
    </div>
  );
}
