export async function pickKdbx() {
    const [handle] = await window.showOpenFilePicker({
        types: [{ description: "KeePass DB", accept: { "application/octet-stream": [".kdbx"] } }],
        excludeAcceptAllOption: false,
        multiple: false,
    });
    return handle;
}
export async function ensurePerm(handle, mode) {
    const res = await handle.requestPermission?.({ mode });
    if (res !== "granted")
        throw new Error("Permission denied");
}
export async function readBytes(handle) {
    const file = await handle.getFile();
    return file.arrayBuffer();
}
export async function writeBytes(handle, bytes) {
    const w = await handle.createWritable();
    await w.write(bytes);
    await w.close();
}
