
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as acorn from 'acorn';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.resolve(__dirname, '../dist/userscript/x-flow.user.js');

if (!fs.existsSync(targetFile)) {
  console.error('File not found:', targetFile);
  process.exit(1);
}

const content = fs.readFileSync(targetFile, 'utf-8');
const headerEndMarker = '// ==/UserScript==';
const headerIndex = content.indexOf(headerEndMarker);

if (headerIndex === -1) {
  console.error('Userscript header end marker not found!');
  process.exit(1);
}

const header = content.slice(0, headerIndex + headerEndMarker.length);
const body = content.slice(headerIndex + headerEndMarker.length);

const comments = [];
acorn.parse(body, {
  ecmaVersion: 'latest',
  sourceType: 'script',
  onComment: (isBlock, text, start, end) => {
    comments.push({ start, end });
  }
});

console.log('Acorn found comments in body:', comments.length);

// Sort ranges just in case
comments.sort((a, b) => a.start - b.start);

let strippedBody = '';
let lastIndex = 0;
for (const { start, end } of comments) {
  strippedBody += body.slice(lastIndex, start);
  lastIndex = end;
}
strippedBody += body.slice(lastIndex);

// Clean up lines that only had comments and now are blank
strippedBody = strippedBody.replace(/^\s*$\n/gm, '');

fs.writeFileSync(targetFile, header + '\n\n' + strippedBody.trimStart() + '\n', 'utf-8');
console.log('Successfully stripped all comments using Acorn parser!');
