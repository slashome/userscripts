// ==UserScript==
// @name         Instagram Popup Closer
// @description  Automatically clicks the close (X) button of Instagram's signup/login upsell popup as soon as it shows up.
// @version      1.0.0
// @namespace    https://github.com/slashome
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/main/scripts/instagram-popup-closer.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/main/scripts/instagram-popup-closer.user.js
// @match        *://*.instagram.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const LOG_PREFIX = '[Instagram Popup Closer]';

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

    const handled = new WeakSet();

    function log(...args) {
        console.log(LOG_PREFIX, ...args);
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
        const label = (svg.getAttribute('aria-label') || svg.querySelector('title')?.textContent || '')
            .trim()
            .toLowerCase();
        return CLOSE_LABELS.includes(label);
    }

    function findCloseButton(dialog) {
        for (const svg of dialog.querySelectorAll('svg')) {
            if (!isCloseIcon(svg)) continue;
            const button = svg.closest('[role="button"], button');
            if (button && isDisplayed(button)) return button;
        }
        return null;
    }

    function isUpsellPopup(dialog) {
        // A real post modal embeds an <article>; the upsell one never does.
        if (dialog.querySelector('article')) return false;
        const text = dialog.textContent || '';
        return CTA_PATTERNS.some(pattern => pattern.test(text));
    }

    function closePopups() {
        for (const dialog of document.querySelectorAll('div[role="dialog"][aria-modal="true"]')) {
            if (handled.has(dialog) || !isDisplayed(dialog) || !isUpsellPopup(dialog)) continue;

            const button = findCloseButton(dialog);
            if (!button) continue;

            handled.add(dialog);
            log('Closing upsell popup');
            button.click();
        }
    }

    const observer = new MutationObserver(() => { closePopups(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    closePopups();
})();
