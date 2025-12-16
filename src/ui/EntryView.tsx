import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Grid,
  Typography,
  Stack,
  Divider,
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

type Props = {
  entry: any; // KdbxEntry
  onChange: () => void;
  onClose: () => void;
  onSave: () => void;
  onCopy: (text: string) => void;
};

function unwrap(val: any): string {
  if (!val) return "";
  return val.getText ? val.getText() : String(val);
}

export default function EntryView({ entry, onChange, onClose, onSave, onCopy }: Props) {
  // We need local state to handle editing fields properly
  const [showPassword, setShowPassword] = useState(false);

  // Local state for form fields to ensure instant UI feedback (controlled components)
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  const getField = (key: string) => {
    const v = entry?.fields?.get ? entry.fields.get(key) : entry?.fields?.[key];
    return unwrap(v);
  };

  // Sync state from entry when entry changes
  useEffect(() => {
    setTitle(getField("Title"));
    setUsername(getField("UserName"));
    setPassword(getField("Password"));
    setUrl(getField("URL"));
    setNotes(getField("Notes"));
  }, [entry]);

  // Helper to sync local state back to KdbxEntry
  const setField = (key: string, val: string) => {
    // 1. Update local state immediately
    if (key === "Title") setTitle(val);
    if (key === "UserName") setUsername(val);
    if (key === "Password") setPassword(val);
    if (key === "URL") setUrl(val);
    if (key === "Notes") setNotes(val);

    // 2. Update the underlying KDBX object
    if (!entry.fields) return;
    if (typeof entry.fields.set === 'function') {
      entry.fields.set(key, val);
    } else {
      entry.fields[key] = val;
    }

    // 3. Mark app as dirty
    onChange();
  };

  return (
    <Card elevation={3}>
      <CardHeader
        title="Entry Details"
        action={
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        }
      />
      <Divider />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            label="Title"
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setField("Title", e.target.value)}
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Username"
                fullWidth
                value={username}
                onChange={(e) => setField("UserName", e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => onCopy(username)} edge="end">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Password"
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setField("Password", e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                      <IconButton onClick={() => onCopy(password)} edge="end">
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>

          <TextField
            label="URL"
            fullWidth
            value={url}
            onChange={(e) => setField("URL", e.target.value)}
            InputProps={{
              endAdornment: url ? (
                <InputAdornment position="end">
                  <Button
                    variant="text"
                    size="small"
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </Button>
                </InputAdornment>
              ) : undefined
            }}
          />

          <TextField
            label="Notes"
            fullWidth
            multiline
            minRows={3}
            value={notes}
            onChange={(e) => setField("Notes", e.target.value)}
          />
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">Close</Button>
        <Button onClick={onSave} variant="contained" color="primary">Save & Close</Button>
      </CardActions>
    </Card>
  );
}
