import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Card,
  CardContent,
  Typography,
  Link,
  Stack,
  IconButton,
  Tooltip
} from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LaunchIcon from '@mui/icons-material/Launch';
import PersonIcon from '@mui/icons-material/Person';
import KeyIcon from '@mui/icons-material/Key';

type Props = {
  entries: any[];
  onReveal: (id: string) => Promise<string>;
  onCopy: (text: string) => Promise<void>;
  onOpen: (id: string) => void;
};

export default function EntryList({ entries, onReveal, onCopy, onOpen }: Props) {
  if (!entries.length) {
    return (
      <Typography variant="body1" sx={{ opacity: 0.7, fontStyle: 'italic', mt: 2 }}>
        No entries found.
      </Typography>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper} variant="outlined">
          <Table aria-label="entries table" size="small">
            <TableHead>
              <TableRow>
                <TableCell width={100}>Actions</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>URL</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((e) => (
                <TableRow
                  key={e.uuid}
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Stack direction="row" spacing={0}>
                      <Tooltip title="Copy Username">
                        <span>
                          <IconButton
                            size="small"
                            onClick={async () => onCopy(e.username || "")}
                            disabled={!e.username}
                            color="primary"
                          >
                            <PersonIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Copy Password">
                        <IconButton
                          size="small"
                          onClick={async () => { const pw = await onReveal(e.uuid); await onCopy(pw); }}
                          color="primary"
                        >
                          <KeyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => onOpen(e.uuid)}
                      underline="hover"
                      fontWeight="bold"
                      textAlign="left"
                      color="primary"
                    >
                      {e.title || "(no title)"}
                    </Link>
                  </TableCell>
                  <TableCell>{e.username || "—"}</TableCell>
                  <TableCell>
                    {e.url ? (
                      <Link href={e.url} target="_blank" rel="noreferrer" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} color="primary">
                        {e.url.replace(/^https?:\/\//, "").substring(0, 30)}
                        {e.url.length > 30 ? "..." : ""}
                        <LaunchIcon fontSize="inherit" />
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Mobile Card View */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
        {entries.map((e) => (
          <Card key={e.uuid} variant="outlined">
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="h6" component="div" onClick={() => onOpen(e.uuid)} sx={{ cursor: 'pointer', mb: 1, color: 'primary.main' }}>
                {e.title || "(no title)"}
              </Typography>

              {!!e.username && (
                <Typography color="text.secondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  👤 {e.username}
                </Typography>
              )}

              {!!e.url && (
                <Typography color="text.secondary" variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  🔗 <Link href={e.url} target="_blank" rel="noreferrer" color="primary">{e.url.replace(/^https?:\/\//, "")}</Link>
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={async () => onCopy(e.username || "")}
                  disabled={!e.username}
                  startIcon={<PersonIcon />}
                >
                  User
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  onClick={async () => { const pw = await onReveal(e.uuid); await onCopy(pw); }}
                  startIcon={<KeyIcon />}
                >
                  Pass
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    </>
  );
}
