import React from "react";

type Props = {
  entries: any[];
  onReveal: (id: string) => Promise<string>;
  onCopy: (text: string) => Promise<void>;
  onOpen: (id: string) => void;
};

export default function EntryList({ entries, onReveal, onCopy, onOpen }: Props) {
  if (!entries.length) return <p>No entries.</p>;

  return (
    <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>Title</th>
          <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>Username</th>
          <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>URL</th>
          <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 6 }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.uuid}>
            <td style={{ padding: 6 }}>
              <a href="#" onClick={(ev) => { ev.preventDefault(); onOpen(e.uuid); }}>
                {e.title || "(no title)"}
              </a>
            </td>
            <td style={{ padding: 6 }}>{e.username || ""}</td>
            <td style={{ padding: 6 }}>
              {e.url ? (
                <a href={e.url} target="_blank" rel="noreferrer">
                  {e.url.replace(/^https?:\/\//, "")}
                </a>
              ) : ""}
            </td>
            <td style={{ padding: 6, display: "flex", gap: 8 }}>
              <button onClick={async () => {
                const pw = await onReveal(e.uuid);
                alert(`Password: ${pw}\n\n(it will be cleared from clipboard soon)`);
              }}>Reveal</button>
              <button onClick={async () => onCopy(e.username || "")} disabled={!e.username}>Copy user</button>
              <button onClick={async () => {
                const pw = await onReveal(e.uuid);
                await onCopy(pw);
              }}>Copy pass</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
