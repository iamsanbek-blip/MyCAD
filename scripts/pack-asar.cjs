'use strict';
// Small, dependency-free ASAR writer for the existing Electron runtime.
// This packs application code only; it does not build a Windows executable.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.resolve(process.argv[2] || path.join(root, 'dist', 'app.asar'));
const header = {files: {}};
const payloads = [];
let offset = 0;

function add(relative) {
  const absolute = path.join(root, relative);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink()) throw new Error('Unexpected symlink: ' + relative);
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(absolute).sort()) add(path.join(relative, name));
    return;
  }
  const content = fs.readFileSync(absolute);
  const parts = relative.split(path.sep);
  let folder = header;
  for (const name of parts.slice(0, -1)) folder = folder.files[name] ||= {files: {}};
  const blockSize = 4 * 1024 * 1024;
  const hash = data => crypto.createHash('sha256').update(data).digest('hex');
  const blocks = [];
  for (let start = 0; start < content.length; start += blockSize) blocks.push(hash(content.subarray(start, start + blockSize)));
  if (!blocks.length) blocks.push(hash(content));
  folder.files[parts.at(-1)] = {size: content.length, offset: String(offset),
    integrity: {algorithm: 'SHA256', hash: hash(content), blockSize, blocks}};
  payloads.push({relative, content});
  offset += content.length;
}

for (const name of ['package.json', 'main.js', 'preload.js', 'preload-splash.js', 'splash.html', 'desktop', 'app', 'assets']) add(name);
const json = Buffer.from(JSON.stringify(header));
const padding = (4 - json.length % 4) % 4;
const pickle = Buffer.alloc(8 + json.length + padding);
pickle.writeUInt32LE(4 + json.length + padding, 0);
pickle.writeUInt32LE(json.length, 4);
json.copy(pickle, 8);
const size = Buffer.alloc(8);
size.writeUInt32LE(4, 0);
size.writeUInt32LE(pickle.length, 4);
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, Buffer.concat([size, pickle, ...payloads.map(p => p.content)]));

// Re-read the actual bytes and ensure each archived file matches its source.
const archive = fs.readFileSync(output);
const decoded = JSON.parse(archive.subarray(16, 16 + archive.readUInt32LE(12)));
const dataStart = 8 + archive.readUInt32LE(4);
for (const entry of payloads) {
  let node = decoded;
  for (const part of entry.relative.split(path.sep)) node = node.files[part];
  const start = dataStart + Number(node.offset);
  if (!archive.subarray(start, start + node.size).equals(entry.content)) throw new Error('Archive mismatch: ' + entry.relative);
}
const sha256 = crypto.createHash('sha256').update(archive).digest('hex');
fs.writeFileSync(output + '.sha256', sha256 + '\n');
console.log(`ASAR verified: ${payloads.length} files, ${archive.length} bytes, SHA256 ${sha256}`);

