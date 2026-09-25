// Encrypts secret/bank.html with the guest code and embeds it in index.html.
// Usage: GIFT_CODE=... node tools/encrypt.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const ITERATIONS = 1_000_000;
const root = new URL('..', import.meta.url);
// same normalisation as script.js: case, spaces and dashes don't matter
const code = (process.env.GIFT_CODE || '').toLowerCase().replace(/[^a-z0-9]/g, '');
if (!code) {
    console.error('Set GIFT_CODE');
    process.exit(1);
}

const plaintext = readFileSync(new URL('secret/bank.html', root), 'utf8');
const enc = new TextEncoder();
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
);
const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const vault = JSON.stringify({ iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(data)) });

const indexUrl = new URL('index.html', root);
const html = readFileSync(indexUrl, 'utf8');
const re = /(<!-- vault:start -->)[\s\S]*?(\s*<!-- vault:end -->)/;
if (!re.test(html)) {
    console.error('vault markers not found in index.html');
    process.exit(1);
}
const block = `\n                <script type="application/json" id="vault">${vault}</script>`;
writeFileSync(indexUrl, html.replace(re, `$1${block}$2`));
console.log('index.html updated');
