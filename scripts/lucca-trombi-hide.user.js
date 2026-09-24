// ==UserScript==
// @name         Lucca - Masquer des collaborateurs du trombinoscope
// @description  Ajoute un bouton sur chaque photo du trombinoscope Lucca pour masquer la personne, et un bouton à côté de "Organigramme" pour tout réafficher. Les personnes masquées sont mémorisées dans le localStorage.
// @version      1.0.0
// @namespace    https://ilucca.net
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/main/scripts/lucca-trombi-hide.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/main/scripts/lucca-trombi-hide.user.js
// @match        *://*.ilucca.net/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'lucca-trombi-hidden-names';
    const TILE_SELECTOR = 'li[trombi-user-tile]';
    const TILE_NAME_SELECTOR = '.employeeTile-infos h4';
    const ORG_CHART_LINK_SELECTOR = '.pageHeader-content-actions a[href="/directory/employee-organization"]';
    const HIDE_BUTTON_CLASS = 'lucca-trombi-hide-button';
    const SHOW_ALL_BUTTON_ID = 'lucca-trombi-show-all-button';
    const STYLE_ID = 'lucca-trombi-hide-style';

    const EYE_OFF_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.6 18.6 0 0 1 4.22-5.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    const EYE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

    let hiddenNames = loadHiddenNames();
    let refreshTimer = null;

    function loadHiddenNames() {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return new Set(Array.isArray(stored) ? stored : []);
        } catch {
            return new Set();
        }
    }

    function saveHiddenNames() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...hiddenNames]));
        } catch {
            return;
        }
    }

    function getTileName(tile) {
        const nameElement = tile.querySelector(TILE_NAME_SELECTOR);
        return nameElement ? nameElement.textContent.trim() : null;
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            ${TILE_SELECTOR} { position: relative; }
            .${HIDE_BUTTON_CLASS} {
                position: absolute;
                top: 8px;
                right: 8px;
                z-index: 2;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 28px;
                height: 28px;
                padding: 0;
                border: 1px solid #d8dce6;
                border-radius: 999px;
                background: #ffffff;
                color: #33415c;
                cursor: pointer;
                box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
                opacity: 0;
                transition: opacity .15s ease, background-color .15s ease, color .15s ease;
            }
            ${TILE_SELECTOR}:hover .${HIDE_BUTTON_CLASS},
            .${HIDE_BUTTON_CLASS}:focus-visible { opacity: 1; }
            .${HIDE_BUTTON_CLASS}:hover { background: #f1edfb; border-color: #a48ce8; color: #5b3cc4; }
            #${SHOW_ALL_BUTTON_ID} { margin-left: 8px; }
            #${SHOW_ALL_BUTTON_ID} .lucca-trombi-show-all-icon { display: inline-flex; margin-right: 6px; }
        `;
        document.head.appendChild(style);
    }

    function createHideButton(tile, name) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = HIDE_BUTTON_CLASS;
        button.title = `Masquer ${name}`;
        button.setAttribute('aria-label', `Masquer ${name}`);
        button.innerHTML = EYE_OFF_ICON;

        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const name = getTileName(tile);
            if (!name) return;
            hiddenNames.add(name);
            saveHiddenNames();
            refresh();
        });

        return button;
    }

    function createShowAllButton() {
        const button = document.createElement('button');
        button.id = SHOW_ALL_BUTTON_ID;
        button.type = 'button';
        button.className = 'button mod-outlined palette-none is-default';

        const icon = document.createElement('span');
        icon.className = 'lucca-trombi-show-all-icon';
        icon.innerHTML = EYE_ICON;

        const label = document.createElement('span');
        label.className = 'lucca-trombi-show-all-label';

        button.appendChild(icon);
        button.appendChild(label);

        button.addEventListener('click', () => {
            hiddenNames = new Set();
            saveHiddenNames();
            refresh();
        });

        return button;
    }

    function syncTiles() {
        document.querySelectorAll(TILE_SELECTOR).forEach(tile => {
            const name = getTileName(tile);
            if (!name) return;

            if (!tile.querySelector(`.${HIDE_BUTTON_CLASS}`)) {
                tile.appendChild(createHideButton(tile, name));
            }

            const display = hiddenNames.has(name) ? 'none' : '';
            if (tile.style.display !== display) tile.style.display = display;
        });
    }

    function syncShowAllButton() {
        const orgChartLink = document.querySelector(ORG_CHART_LINK_SELECTOR);
        let button = document.getElementById(SHOW_ALL_BUTTON_ID);

        if (!orgChartLink) {
            if (button) button.remove();
            return;
        }

        if (!button) {
            button = createShowAllButton();
        }
        if (orgChartLink.nextElementSibling !== button) {
            orgChartLink.after(button);
        }

        const label = button.querySelector('.lucca-trombi-show-all-label');
        const text = `Réafficher tout le monde (${hiddenNames.size})`;
        if (label.textContent !== text) label.textContent = text;
        button.disabled = hiddenNames.size === 0;
    }

    function refresh() {
        injectStyle();
        syncTiles();
        syncShowAllButton();
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(refresh, 100);
    }

    window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEY) return;
        hiddenNames = loadHiddenNames();
        refresh();
    });

    const bodyObserver = new MutationObserver(scheduleRefresh);
    bodyObserver.observe(document.body, { childList: true, subtree: true, characterData: true });

    refresh();
})();
