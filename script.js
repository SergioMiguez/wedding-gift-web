const STRINGS = {
    es: { copy: 'Copiar', copied: 'Copiado', title: 'Sergio & Micaela · Regalos' },
    en: { copy: 'Copy', copied: 'Copied', title: 'Sergio & Micaela · Gifts' },
};

function storedLang() {
    try {
        return localStorage.getItem('lang');
    } catch {
        return null;
    }
}

function initialLang() {
    const param = new URLSearchParams(location.search).get('lang');
    if (Object.hasOwn(STRINGS, param)) return param;
    const saved = storedLang();
    if (Object.hasOwn(STRINGS, saved)) return saved;
    const prefersSpanish = (navigator.languages || [navigator.language || ''])
        .some((l) => l.toLowerCase().startsWith('es'));
    return prefersSpanish ? 'es' : 'en';
}

function setLang(lang, persist) {
    const root = document.documentElement;
    root.lang = lang;
    root.dataset.lang = lang;
    document.title = STRINGS[lang].title;
    document.querySelectorAll('[data-set-lang]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.setLang === lang));
    });
    document.querySelectorAll('.copy').forEach((b) => {
        b.textContent = STRINGS[lang].copy;
    });
    if (persist) {
        try {
            localStorage.setItem('lang', lang);
        } catch {
            /* private mode: choice just isn't remembered */
        }
    }
}

let toastTimer;
function toast(message) {
    const el = document.querySelector('.toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand('copy');
        area.remove();
        return ok;
    }
}

document.querySelectorAll('[data-set-lang]').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.setLang, true));
});

document.addEventListener('click', async (e) => {
    const b = e.target.closest('.copy');
    if (b && (await copyText(b.dataset.copy))) {
        const lang = document.documentElement.dataset.lang;
        toast(`${STRINGS[lang].copied} · ${b.dataset.copy}`);
    }
});

// Bank details ship AES-GCM encrypted with a key derived from the guest code.
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function decryptVault(code) {
    const vault = JSON.parse(document.getElementById('vault').textContent);
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(vault.salt), iterations: vault.iterations },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
    );
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(vault.iv) }, key, fromB64(vault.data));
    return new TextDecoder().decode(plain);
}

async function unlock(rawCode, remember) {
    const code = rawCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    let html;
    try {
        html = await decryptVault(code);
    } catch {
        return false;
    }
    const details = document.querySelector('.bank-details');
    details.innerHTML = html;
    details.hidden = false;
    document.querySelector('.unlock').hidden = true;
    setLang(document.documentElement.dataset.lang, false);
    if (remember) {
        try {
            localStorage.setItem('giftCode', code);
        } catch {
            /* not remembered; guest re-enters it next time */
        }
    }
    return true;
}

const form = document.querySelector('.unlock');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // WebCrypto only exists on HTTPS; without it every code would look wrong.
    if (!window.crypto?.subtle) {
        form.querySelector('.unlock-insecure').hidden = false;
        return;
    }
    const button = form.querySelector('button');
    const error = form.querySelector('.unlock-error:not(.unlock-insecure)');
    button.disabled = true;
    error.hidden = true;
    const ok = await unlock(form.code.value, true);
    button.disabled = false;
    if (!ok) {
        error.hidden = false;
        form.code.select();
    }
});

setLang(initialLang(), false);

try {
    const saved = localStorage.getItem('giftCode');
    if (saved) {
        unlock(saved, false).then((ok) => {
            if (!ok) localStorage.removeItem('giftCode');
        });
    }
} catch {
    /* storage unavailable */
}
