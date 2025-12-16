import React, { useMemo, useState } from "react";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Badge,
  Box,
  Typography
} from "@mui/material";
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

export type GroupNode = {
  id: string;
  name: string;
  count: number;        // shallow entry count
  children: GroupNode[];
  hasModified?: boolean; // NEW: true if this group or children contain modified entries
};

type Props = {
  tree: GroupNode | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  defaultCollapsed?: boolean; // default true
  modifiedIds?: Set<string>; // (Not strictly used here if we pre-calculate hasModified in App.tsx, but good for interface)
};

export default function GroupTree({ tree, selectedId, onSelect, defaultCollapsed = true }: Props) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  // open root at least
  const rootId = useMemo(() => tree?.id ?? "", [tree]);
  useMemo(() => {
    if (!rootId) return;
    setOpen((s) => {
      const n = new Set(s);
      n.add(rootId);
      return n;
    });
  }, [rootId]);

  if (!tree) return null;

  function toggle(id: string, e: React.MouseEvent) {
    e.stopPropagation();
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
    const isSelected = selectedId === node.id;
    const isModified = node.hasModified;

    return (
      <>
        <ListItemButton
          selected={isSelected}
          onClick={() => onSelect(node.id)}
          sx={{ pl: depth * 2 + 2, py: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Badge variant="dot" color="warning" invisible={!isModified}>
              {isOpen ? <FolderOpenIcon color={isModified ? "warning" : "primary"} fontSize="small" /> : <FolderIcon color={isModified ? "warning" : "disabled"} fontSize="small" />}
            </Badge>
          </ListItemIcon>

          <ListItemText
            primary={node.name}
            secondary={node.count > 0 ? `${node.count} items` : null}
            primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: isSelected ? 600 : 400, color: isModified ? 'warning.main' : 'inherit' }}
            secondaryTypographyProps={{ fontSize: '0.75rem' }}
          />

          {hasKids && (
            <Box onClick={(e) => toggle(node.id, e)} sx={{ p: 0.5, borderRadius: '50%', '&:hover': { bgcolor: 'action.hover' } }}>
              {isOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Box>
          )}
        </ListItemButton>

        {hasKids && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {node.children.map((c) => (
                <Item key={c.id} node={c} depth={depth + 1} />
              ))}
            </List>
          </Collapse>
        )}
      </>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
      <ListItemButton onClick={() => onSelect(null)} selected={selectedId === null} sx={{ mb: 1 }}>
        <ListItemIcon sx={{ minWidth: 32 }}>
          <Inventory2OutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary="All Items" />
      </ListItemButton>

      <List component="nav" aria-label="main mailbox folders" disablePadding>
        <Item node={tree} depth={0} />
      </List>
    </Box>
  );
}
