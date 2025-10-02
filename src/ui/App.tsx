import React, { useState } from 'react';
import { pickKdbx, ensurePerm, readBytes, writeBytes } from '../fs/fileAccess';
import { openKdbx, saveKdbx } from '../crypto/keepass';


export default function App(){
const [db, setDb] = useState<any>(null);
const [handle, setHandle] = useState<FileSystemFileHandle|null>(null);
const [status, setStatus] = useState('Ready');


return (
<div className="p-4 max-w-3xl mx-auto font-sans">
<h1 className="text-2xl font-bold">One Saavi</h1>
<div className="mt-4 flex gap-2">
<button onClick={async ()=>{
const h = await pickKdbx();
await ensurePerm(h, 'readwrite');
setHandle(h);
const bytes = await readBytes(h);
const password = prompt('Master password') ?? '';
const opened = await openKdbx(bytes, password);
setDb(opened);
setStatus('Opened');
}}>Open</button>
<button disabled={!db || !handle} onClick={async()=>{
if (!db || !handle) return;
const out = await saveKdbx(db);
await writeBytes(handle, out);
setStatus('Saved');
}}>Save</button>
</div>
<p className="mt-2 text-sm opacity-80">{status}</p>
</div>
);
}