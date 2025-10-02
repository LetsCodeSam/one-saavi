import React, { useMemo, useState } from "react";

export type GroupNode = {
  id: string;
  name: string;
  count: number;        // shallow entry count
  children: GroupNode[];
};

type Props = {
  tree: GroupNode | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  defaultCollapsed?: boolean; // default true
};

export default function GroupTree({ tree, selectedId, onSelect, defaultCollapsed = true }: Props) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  // open root at least
  const rootId = useMemo(() => tree?.id ?? "", [tree]);
  useMemo(() => {
    if (!rootId) return;
    setOpen((s) => {
      const n = new Set(s);
      // root expanded, children collapsed by default
      n.add(rootId);
      return n;
    });
  }, [rootId]);

  if (!tree) return null;

  function toggle(id: string) {
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function Item({ node, depth }: { node: GroupNode; depth: number }) {
    const hasKids = node.children.length > 0;
    const isOpen = open.has(node.id);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {hasKids ? (
            <button
              onClick={() => toggle(node.id)}
              aria-label={isOpen ? "Collapse" : "Expand"}
              title={isOpen ? "Collapse" : "Expand"}
              style={{
                width: 22, height: 22, marginRight: 4, border: "1px solid #ddd",
                borderRadius: 4, lineHeight: "20px", background: "#fff", cursor: "pointer"
              }}
            >
              {isOpen ? "▾" : "▸"}
            </button>
          ) : (
            <span style={{ display: "inline-block", width: 22 }} />
          )}

          <button
            onClick={() => onSelect(node.id)}
            style={{
              padding: "4px 6px",
              marginLeft: depth * 10,
              textAlign: "left",
              background: selectedId === node.id ? "#eef2ff" : "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: 6
            }}
            title={`${node.name} (${node.count})`}
          >
            {node.name} <span style={{ opacity: .6 }}>({node.count})</span>
          </button>
        </div>

        {hasKids && isOpen && (
          <div>
            {node.children.map((c) => (
              <Item key={c.id} node={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 8, maxHeight: "65vh", overflow: "auto" }}>
      <button onClick={() => onSelect(null)} style={{ marginBottom: 8 }}>All Items</button>
      <Item node={tree} depth={0} />
    </div>
  );
}
