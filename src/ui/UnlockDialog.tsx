import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Stack
} from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import KeyIcon from '@mui/icons-material/Key';
import UploadFileIcon from '@mui/icons-material/UploadFile';

type Props = {
  open: boolean;
  onCancel: () => void;
  onUnlock: (password: string, keyFile?: File) => void;
};

export default function UnlockDialog({ open, onCancel, onUnlock }: Props) {
  const [pw, setPw] = useState("");
  const [reveal, setReveal] = useState(false);
  const [keyFile, setKeyFile] = useState<File | undefined>(undefined);

  // Anti-autofill random name
  const [pwName] = useState(() => "pw_" + Math.random().toString(36).slice(2));

  // Reset dialog each time it opens
  useEffect(() => {
    if (!open) return;
    setPw("");
    setReveal(false);
    setKeyFile(undefined);
  }, [open]);

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (pw) onUnlock(pw, keyFile);
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Unlock Vault</DialogTitle>

      <DialogContent>
        <form onSubmit={submit} style={{ marginTop: 8 }}>
          <Stack spacing={3}>
            <TextField
              autoFocus
              label="Master Password"
              type={reveal ? "text" : "password"}
              fullWidth
              variant="outlined"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              name={pwName}
              autoComplete="off"
              inputProps={{
                autoComplete: "one-time-code",
                form: { autocomplete: 'off' },
                "data-lpignore": "true", // LastPass
                "data-form-type": "other",
                "data-1p-ignore": "true", // 1Password
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <KeyIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setReveal(!reveal)}
                      edge="end"
                    >
                      {reveal ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Box>
              <Typography variant="body2" gutterBottom>
                Key File (Optional)
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileIcon />}
                  size="small"
                >
                  Select File
                  <input
                    type="file"
                    hidden
                    accept=".key"
                    onChange={(e) => setKeyFile(e.target.files?.[0] || undefined)}
                  />
                </Button>
                {keyFile && (
                  <Typography variant="caption" noWrap sx={{ maxWidth: 200 }}>
                    {keyFile.name}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Stack>

          {/* Hidden submit for Enter key */}
          <input type="submit" hidden />
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={() => submit()} variant="contained" disabled={!pw}>
          Unlock
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Helper Box component since we used it
import { Box } from "@mui/material";
