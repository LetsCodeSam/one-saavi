import React from "react";

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
};

function Item({
  node, selectedId, onSelect, depth
}: { node: GroupNode; selectedId: string | null; onSelect: Props["onSelect"]; depth: number }) {
  return (
    <div>
      <button
        onClick={() => onSelect(node.id)}
        style={{
          padding: "4px 6px",
          marginLeft: depth * 12,
          width: "100%",
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
      {node.children.map(c => (
        <Item key={c.id} node={c} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function GroupTree({ tree, selectedId, onSelect }: Props) {
  if (!tree) return null;
  return (
    <div style={{ padding: 8 }}>
      <button onClick={() => onSelect(null)} style={{ marginBottom: 8 }}>
        All Items
      </button>
      <Item node={tree} selectedId={selectedId} onSelect={onSelect} depth={0} />
    </div>
  );
}
