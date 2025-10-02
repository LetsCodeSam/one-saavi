📖 One Saavi — Project Overview

A web-based KeePass (.kdbx) client that runs fully client-side with local file access and OneDrive integration via system file picker.
Deployed to GitHub Pages with Vite + React + TypeScript.

🔧 Tech Stack

React + TypeScript (Vite build tool)

kdbxweb → read/write KeePass DBs

File System Access API → desktop persistent file handles

IndexedDB (idb) → fallback storage for mobile

Service Worker → PWA/offline

Custom CSS (app.css) → responsive design, mobile drawer, entry cards

📂 Project Structure
src/
  App.tsx               # main app component (desktop + mobile)
  main.tsx              # entrypoint, renders <App />
  app.css               # global CSS (responsive styles)

  fs/
    fileAccess.ts       # helpers for File System Access API
    mobileStore.ts      # IndexedDB fallback (mobile encrypted bytes)

  crypto/
    keepass.ts          # open/save KeePass DB using kdbxweb

  ui/
    EntryList.tsx       # list of entries (table on desktop, cards on mobile)
    EntryView.tsx       # single entry editor (title, username, password, notes)
    GroupTree.tsx       # group sidebar (collapsible, collapsed by default)
    UnlockDialog.tsx    # masked unlock modal (password + key file)

public/
  sw.js                 # service worker for offline
  manifest.webmanifest  # PWA metadata

✨ Features
Core

Open / Save KeePass .kdbx databases.

Desktop: File System Access API (persistent handles).

Mobile: File input + “Save As” fallback.

Groups tree (collapsible, collapsed by default).

Entry list:

Table on desktop.

Card layout on mobile (with big User/Pass buttons).

Entry editor:

Edit title, username, URL, notes.

Masked password with reveal toggle.

Copy User/Pass with auto-clear clipboard after 15s.

Unlock dialog:

Masked password input with show/hide toggle.

Optional key file.

Enter/Return = submit, Escape =

You said:
can u checlk all functions included /& make it as markdown.. 
ChatGPT said:

Perfect 👍 — let’s document all functions, components, helpers in your project so you (or future devs) have a clear reference.
Here’s a complete Markdown documentation you can drop in docs/functions-overview.md.

📖 One Saavi — Functions & Components Overview

This document lists all key functions and components in the One Saavi project, their purpose, and where they live.

🗂️ File Structure & Key Files
src/
  App.tsx
  main.tsx
  app.css

  fs/
    fileAccess.ts
    mobileStore.ts

  crypto/
    keepass.ts

  ui/
    EntryList.tsx
    EntryView.tsx
    GroupTree.tsx
    UnlockDialog.tsx

public/
  sw.js
  manifest.webmanifest

🖥️ src/App.tsx — Main App Component

Handles global state: open/save DB, groups, entries, search, unlock dialog, responsive layout.

State

db → KeePass database object

handle → FileSystemFileHandle (desktop only)

status → Status string for UI

fileName → Current file name

dirty → Marks unsaved changes

selectedGroupId → Group filter

openedEntryId → Entry selected for editing

unlockOpen → Unlock dialog state

pendingBytes → Encrypted KDBX bytes waiting to unlock

q → Search query

drawerOpen → Mobile sidebar drawer open/closed

Functions

doOpen() → Desktop: show picker, get handle, prepare unlock.

doSave() → Desktop: save changes back to file.

handleMobileFile(file) → Mobile: read file bytes, prepare unlock.

saveAsDownload() → Mobile: export DB as .kdbx.

handleUnlock(password, keyFile?) → Unlock DB from pending bytes.

rootGroup (memo) → Finds root or “Saavi” group.

groupTree (memo) → Builds tree for sidebar.

entries (memo) → Flattened entry list under selected group.

filteredEntries (memo) → Entries filtered by search query.

selectedEntry (memo) → Currently opened entry.

revealPassword(entryUuid) → Returns plaintext password for entry.

copyAndClear(text, ms=15000) → Copies text to clipboard and clears after 15s.

markDirty() → Marks DB as edited.

📁 src/fs/fileAccess.ts — File API (Desktop)

Helpers for File System Access API.

pickKdbx() → Opens .kdbx file picker, returns handle.

ensurePerm(handle, mode) → Requests read/write permission.

readBytes(handle) → Reads file → ArrayBuffer.

writeBytes(handle, bytes) → Writes ArrayBuffer back to file.

📁 src/fs/mobileStore.ts — Mobile Fallback Store

Keeps encrypted bytes in IndexedDB when no persistent handles.

saveVaultBytes(bytes, name) → Stores Uint8Array + name.

loadVaultBytes() → Restores { bytes, name } or null.

🔐 src/crypto/keepass.ts — KeePass Helpers

Thin wrappers around kdbxweb.

openKdbx(kdbxBytes, password, keyFileBytes?)
→ Opens and decrypts KeePass DB.

saveKdbx(db)
→ Saves DB back to ArrayBuffer (forces Argon2id KDF if possible).

📑 UI Components (src/ui/)
EntryList.tsx

Displays entries.

Desktop → Table view

Mobile → Card view

Props: entries, onReveal, onCopy, onOpen

Buttons: User (copy username), Pass (copy password)

EntryView.tsx

Editor for a single entry.

Shows Title, Username, URL, Password, Notes

Toggles password reveal

Buttons: User, Pass

Functions:

getField(entry, key) → read field

setField(entry, key, val) → update field

unwrap(v) → unwrap ProtectedValue

GroupTree.tsx

Sidebar tree of groups.

Collapsed by default (root expanded)

Props: tree, selectedId, onSelect

Features:

Collapsible subgroups (▸ / ▾)

Counts entries per group

Click group → filter entries

UnlockDialog.tsx

Unlock modal dialog.

State: pw, reveal, keyFile

Props: open, onCancel, onUnlock

Features:

Input type=password (masked)

Show/Hide toggle

Key file input (optional)

Enter = submit, Esc = cancel

Buttons: Cancel, Unlock

⚙️ src/main.tsx — Entry Point

Renders <App /> to #root

Registers service worker (only in production):

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(new URL("sw.js", import.meta.env.BASE_URL));
}

🌐 public/sw.js — Service Worker

Caches app shell for offline.

Handles install, activate, fetch events.

Clears old cache on activate.

Serves cached files, falls back to network.

📱 Responsive / Mobile Features

app.css:

.app-grid → desktop grid, stacks on mobile

.sidebar → drawer on mobile

.drawer-backdrop → overlay closes sidebar

.card-list / .card → mobile entry cards

.topbar → sticky toolbar

Mobile-only:

☰ button to open sidebar

Cards with big User/Pass buttons

Clipboard auto-clears after 15s

✅ Implemented Functions Checklist

 Unlock DB (dialog, masked input, key file support)

 Open/Save (desktop)

 Open/Save As (mobile)

 Group tree (collapsed by default)

 Entry list (table + cards)

 Entry view/edit (masked password)

 Copy User/Pass (clipboard auto-clear after 15s)

 Search filter (title, username, URL)

 Responsive layout (drawer, sticky toolbar, scrollbars)

 PWA (service worker, manifest)

 GitHub Pages deploy (Vite config + Actions)

 🔒 Security & UX

 Auto-lock timer

Lock the vault after X minutes of inactivity.

Add “Lock now” button in toolbar.

 Clipboard options

User setting for clipboard clear delay (e.g. 5s, 15s, 30s).

Option to disable clipboard copy entirely.

📑 Entries Management

 New Entry

Add “+ New” button in toolbar.

Pre-populate minimal fields (title, username, password).

 Delete Entry

Soft delete → move to Recycle Bin group.

Confirmation dialog before removal.

 Move Entry

Drag-and-drop or context menu → Move to another group.

 Clone Entry

Duplicate with new UUID.

 TOTP Support

Parse otpauth:// URIs from entry fields.

Show countdown + one-time codes inline.

📁 Groups

 New Group / Subgroup

Add button inside GroupTree.

Collapsible UI already exists.

 Rename/Delete Group

Context menu per group.

Confirm before delete.

🔍 Search & Filters

 Search highlighting

Highlight matching text in Title/Username/URL.

 Advanced filters

Filter by: with/without URL, with TOTP, recently used.

📱 Mobile UX

 Better drawer animation (slide + fade).

 Touch-friendly controls (larger tap targets).

 Biometric unlock (if WebAuthn/Passkeys available).

🌐 Sync & Cloud (future)

 OneDrive Graph API integration

Directly list + open files from user’s OneDrive without file picker.

 WebDAV/Nextcloud

Support open/save via remote URLs.

 GitHub private repo storage

Sync .kdbx via GitHub API.

⚡ PWA

 vite-plugin-pwa integration

Precache manifest.

Install prompt.

Custom icons + splash screens.

 Offline lock screen

Show vault unlock even when offline.

🧪 Testing & QA

 Unit tests for helpers (fileAccess, keepass).

 Browser/device matrix testing (Chrome, Edge, Safari iOS, Android).

 Large DB performance benchmarks.

✅ Current state (MVP): open/save, groups, search, entry list, editor, clipboard clear, responsive layout.
📌 Next recommended step: New Entry / Delete Entry to make the app usable for editing, not just viewing.