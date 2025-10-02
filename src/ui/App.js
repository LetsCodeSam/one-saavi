import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { pickKdbx, ensurePerm, readBytes, writeBytes } from '../fs/fileAccess';
import { openKdbx, saveKdbx } from '../crypto/keepass';
export default function App() {
    const [db, setDb] = useState(null);
    const [handle, setHandle] = useState(null);
    const [status, setStatus] = useState('Ready');
    return (_jsxs("div", { className: "p-4 max-w-3xl mx-auto font-sans", children: [_jsx("h1", { className: "text-2xl font-bold", children: "One Saavi" }), _jsxs("div", { className: "mt-4 flex gap-2", children: [_jsx("button", { onClick: async () => {
                            const h = await pickKdbx();
                            await ensurePerm(h, 'readwrite');
                            setHandle(h);
                            const bytes = await readBytes(h);
                            const password = prompt('Master password') ?? '';
                            const opened = await openKdbx(bytes, password);
                            setDb(opened);
                            setStatus('Opened');
                        }, children: "Open" }), _jsx("button", { disabled: !db || !handle, onClick: async () => {
                            if (!db || !handle)
                                return;
                            const out = await saveKdbx(db);
                            await writeBytes(handle, out);
                            setStatus('Saved');
                        }, children: "Save" })] }), _jsx("p", { className: "mt-2 text-sm opacity-80", children: status })] }));
}
