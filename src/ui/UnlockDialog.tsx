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
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Reset dialog each time it opens
  useEffect(() => {
    if (!open) return;
    setPw("");
    setReveal(false);
    setKeyFile(undefined);
    if (keyInputRef.current) keyInputRef.current.value = "";
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // Allow Esc to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  function submit() {
    if (pw) onUnlock(pw, keyFile);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
    >
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 8,
          minWidth: 320,
          boxShadow: "0 8px 30px rgba(0,0,0,.12)",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Unlock vault</h3>

        <label style={{ display: "block", margin: "8px 0 4px" }}>Master password</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            type={reveal ? "text" : "password"}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            // these attributes prevent browser password managers
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="master-password"
            inputMode="text"
            style={{ flex: 1, padding: "6px 8px" }}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Hide password" : "Show password"}
          >
            {reveal ? "Hide" : "Show"}
          </button>
        </div>

        <label style={{ display: "block", margin: "12px 0 6px" }}>Key file (optional)</label>
        <input
          ref={keyInputRef}
          type="file"
          accept=".key"
          onChange={(e) => setKeyFile(e.target.files?.[0] || undefined)}
        />

        {/* Hidden submit button for iOS */}
        <button
          type="submit"
          style={{ position: "absolute", left: -9999, width: 1, height: 1 }}
          aria-hidden="true"
          tabIndex={-1}
        >
          submit
        </button>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" disabled={!pw}>Unlock</button>
        </div>
      </form>
    </div>
  );
}
