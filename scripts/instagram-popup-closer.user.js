// ==UserScript==
// @name         Instagram Popup Closer
// @description  Automatically clicks the close (X) button of Instagram's signup/login upsell popup as soon as it shows up.
// @version      1.1.0
// @namespace    https://github.com/slashome
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/main/scripts/instagram-popup-closer.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/main/scripts/instagram-popup-closer.user.js
// @match        *://instagram.com/*
// @match        *://*.instagram.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const LOG_PREFIX = '[Instagram Popup Closer]';

    // Flip to true (or run `localStorage.ipcDebug = 1`) to trace why a dialog
    // was left alone.
    const DEBUG = false;

    const DIALOG_SELECTOR = 'div[role="dialog"][aria-modal="true"]';

    // Instagram builds every modal the same way, so closing *any* dialog would
    // also close the ones we actually want (a post, the comments...). The popup
    // is therefore identified by the CTAs it carries.
    const CTA_PATTERNS = [
        /s.?inscrire/i, /sign\s?up/i, /create\s.*account/i, /cr[ée]er un compte/i,
        /se connecter/i, /log\s?in/i, /iniciar sesi[óo]n/i, /registrarse/i,
        /iscriviti/i, /accedi/i, /registrieren/i, /anmelden/i, /cadastre-se/i, /entrar/i,
    ];

    // Locale-independent fingerprint of the X icon Instagram uses.
    const CLOSE_ICON_POLYLINE = '20.643 3.357 12 12 3.353 20.647';
    const CLOSE_LABELS = [
        'fermer', 'close', 'cerrar', 'chiudi', 'schließen', 'schliessen',
        'fechar', 'sluiten', 'stäng', 'zamknij', 'kapat',
    ];

    // React can mount the dialog before it wires its handlers, so a single
    // click is not enough — keep trying while the popup is still around.
    const MAX_ATTEMPTS = 8;
    const RETRY_DELAY = 400;
    const SCAN_THROTTLE = 200;

    const attempts = new WeakMap();

    function log(...args) {
        console.log(LOG_PREFIX, ...args);
    }

    function debug(...args) {
        if (DEBUG || localStorage.getItem('ipcDebug')) log(...args);
    }

    function isDisplayed(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function isCloseIcon(svg) {
        if (svg.querySelector(`polyline[points="${CLOSE_ICON_POLYLINE}"]`)) return true;
        const title = svg.querySelector('title');
        const label = (svg.getAttribute('aria-label') || (title && title.textContent) || '')
            .trim()
            .toLowerCase();
        return CLOSE_LABELS.includes(label);
    }

    function findCloseButton(dialog) {
        for (const svg of dialog.querySelectorAll('svg')) {
            if (!isCloseIcon(svg)) continue;
            // `closest` walks out of the SVG subtree into the HTML wrapper.
            const button = svg.closest('[role="button"], button');
            if (button && isDisplayed(button)) return button;
        }
        return null;
    }

    function isUpsellPopup(dialog) {
        // A real post modal embeds an <article>; the upsell one never does.
        if (dialog.querySelector('article')) {
            debug('dialog holds an <article>, left alone');
            return false;
        }
        if (CTA_PATTERNS.some(pattern => pattern.test(dialog.textContent || ''))) return true;
        // Fallback when the CTA wording is a locale we do not list: the upsell
        // illustration is a sprite served from Instagram's static assets.
        const illustration = dialog.querySelector('i[data-visualcompletion="css-img"][role="img"]');
        if (illustration && /rsrc\.php/.test(illustration.style.backgroundImage || '')) return true;
        debug('dialog matches no upsell signature, left alone');
        return false;
    }

    // A bare `el.click()` is ignored whenever the handler sits on mousedown or
    // pointerdown, which Instagram does use — replay the whole sequence.
    function fireClick(el) {
        const rect = el.getBoundingClientRect();
        const shared = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            button: 0,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
        };

        if (typeof el.focus === 'function') el.focus();

        for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
            const isPointer = type.startsWith('pointer');
            if (isPointer && typeof window.PointerEvent === 'function') {
                el.dispatchEvent(new PointerEvent(type, {
                    ...shared, pointerId: 1, pointerType: 'mouse', isPrimary: true,
                }));
            } else if (!isPointer) {
                el.dispatchEvent(new MouseEvent(type, shared));
            }
        }
    }

    let retryTimer = null;

    function scheduleRetry() {
        if (retryTimer) return;
        retryTimer = setTimeout(() => {
            retryTimer = null;
            closePopups();
        }, RETRY_DELAY);
    }

    function closePopups() {
        for (const dialog of document.querySelectorAll(DIALOG_SELECTOR)) {
            if (!isDisplayed(dialog) || !isUpsellPopup(dialog)) continue;

            const tried = attempts.get(dialog) || 0;
            if (tried >= MAX_ATTEMPTS) continue;

            const button = findCloseButton(dialog);
            if (!button) {
                debug('upsell popup found but no close button yet');
                scheduleRetry();
                continue;
            }

            attempts.set(dialog, tried + 1);
            log(`Closing upsell popup (attempt ${tried + 1}/${MAX_ATTEMPTS})`);
            fireClick(button);
            scheduleRetry();
        }
    }

    let scanTimer = null;

    function scheduleScan() {
        if (scanTimer) return;
        scanTimer = setTimeout(() => {
            scanTimer = null;
            closePopups();
        }, SCAN_THROTTLE);
    }

    // Instagram mutates the DOM constantly, hence the throttle.
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    log('watching for upsell popups');
    closePopups();
})();
