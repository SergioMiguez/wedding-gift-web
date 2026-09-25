# Sergio & Micaela · Regalos / Gifts

Static bilingual (ES/EN) wedding gift page, rebuilt from the Canva design
previously published at `wildcat-9zv99d.my.canva.site`.

- `index.html`, `styles.css`, `script.js`: no build step.
- `img/`: illustrations cut from the Canva export (corners, beach, villa, swans).
- Language: browser language by default; `?lang=es` / `?lang=en` forces it.
- `noindex` meta + `robots.txt` keep polite crawlers away.

## Bank details (guest code)

The bank details are not in the HTML in plain text. They live in
`secret/bank.html` (gitignored) and are embedded in `index.html` encrypted
(PBKDF2-SHA256 1M + AES-GCM); guests unlock them in the browser with the code
from their invitation (case, spaces and dashes are ignored). There is no server,
so the code itself is the protection: keep it random, never names or dates.
Never commit `secret/`. After editing `secret/bank.html` or changing the code:

```bash
GIFT_CODE=<code> node tools/encrypt.mjs
```

## Local preview

```bash
python3 -m http.server 8080
```

## Hosting

GitHub Pages from `main` (root), served at https://kanoii.com (`CNAME`). The
repo is public: it only holds the encrypted bank details. DNS at Namecheap:
four `A @` records to GitHub Pages (185.199.108-111.153) and `CNAME www` to
`sergiomiguez.github.io.`
