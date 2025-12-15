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
  onCopy: (text: string) => void;
};

function unwrap(val: any): string {
  if (!val) return "";
  return val.getText ? val.getText() : String(val);
}

export default function EntryView({ entry, onChange, onClose, onCopy }: Props) {
  // We need local state to handle editing fields properly
  const [showPassword, setShowPassword] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Helper to sync local state back to KdbxEntry
  const setField = (key: string, val: string) => {
    if (!entry.fields) return;
    // rough heuristic: if we have a proper minimal Kdbx structure
    if (typeof entry.fields.set === 'function') {
      // ProtectedValue vs String handling is tricky in raw JS KdbxWeb
      // For now we just set string. 
      // Real implementation usually needs to check if existing is ProtectedValue.
      entry.fields.set(key, val);
    } else {
      entry.fields[key] = val;
    }
    onChange();
  };

  const getField = (key: string) => {
    const v = entry?.fields?.get ? entry.fields.get(key) : entry?.fields?.[key];
    return unwrap(v);
  };

  const title = getField("Title");
  const username = getField("UserName");
  const password = getField("Password");
  const url = getField("URL");
  const notes = getField("Notes");

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
      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </CardActions>
    </Card>
  );
}
