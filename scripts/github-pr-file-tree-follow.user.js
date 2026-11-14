// ==UserScript==
// @name         GitHub PR file tree follow
// @description  Scrolls the file tree of a GitHub pull request along with the diff and highlights the file being read, with an on/off toggle next to the filter button
// @version      1.2
// @namespace    https://github.com
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/main/scripts/github-pr-file-tree-follow.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/main/scripts/github-pr-file-tree-follow.user.js
// @match        https://github.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = 'gh-pr-file-tree-follow';
    const TOGGLE_ID = 'gh-pr-file-tree-follow-toggle';
    const ACTIVE_ATTRIBUTE = 'data-gh-follow-active';
    const DIFF_ID_PATTERN = /^diff-[0-9a-f]{64}$/;
    const PR_FILES_PATH_PATTERN = /^\/[^/]+\/[^/]+\/pull\/\d+\/(files|changes)/;

    const hashCache = new Map();
    let enabled = readEnabled();
    let activeDiffId = null;
    let lastPointer = null;
    let lastUrl = location.href;
    let domChangeTimer = null;
    let frameRequested = false;

    function readEnabled() {
        try {
            return localStorage.getItem(STORAGE_KEY) !== 'off';
        } catch {
            return true;
        }
    }

    function writeEnabled(value) {
        try {
            localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
        } catch {
            // Storage blocked: the toggle still works for this page.
        }
    }

    function isPullRequestFilesPage() {
        return PR_FILES_PATH_PATTERN.test(location.pathname);
    }

    function injectStyle() {
        if (document.getElementById(`${TOGGLE_ID}-style`)) {
            return;
        }
        const style = document.createElement('style');
        style.id = `${TOGGLE_ID}-style`;
        style.textContent = `
            [${ACTIVE_ATTRIBUTE}] > div:first-child,
            a[${ACTIVE_ATTRIBUTE}] {
                background-color: var(--bgColor-neutral-muted, rgba(110, 118, 129, 0.12)) !important;
                box-shadow: inset 2px 0 0 var(--button-primary-bgColor-rest, #238636);
                border-radius: 6px;
            }
            #${TOGGLE_ID} {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                width: 44px;
                height: 32px;
                margin-left: 8px;
                padding: 0;
                border: 1px solid var(--button-default-borderColor-rest, var(--borderColor-default, #3d444d));
                border-radius: 6px;
                background-color: var(--button-default-bgColor-rest, #212830);
                cursor: pointer;
            }
            #${TOGGLE_ID}:hover {
                background-color: var(--button-default-bgColor-hover, #262c36);
            }
            #${TOGGLE_ID} .gh-follow-track {
                position: relative;
                width: 24px;
                height: 14px;
                border: 1px solid var(--fgColor-muted, #9198a1);
                border-radius: 2px;
                box-sizing: border-box;
            }
            #${TOGGLE_ID} .gh-follow-knob {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 8px;
                height: 8px;
                background-color: var(--fgColor-muted, #9198a1);
                transition: left 120ms ease, background-color 120ms ease;
            }
            #${TOGGLE_ID}[aria-pressed="true"] .gh-follow-track {
                border-color: var(--button-primary-bgColor-rest, #238636);
            }
            #${TOGGLE_ID}[aria-pressed="true"] .gh-follow-knob {
                left: 12px;
                background-color: var(--button-primary-bgColor-rest, #238636);
            }
        `;
        document.head.appendChild(style);
    }

    function findFilterInput() {
        return document.querySelector('input[placeholder^="Filter files"], input[aria-label^="Filter files"]');
    }

    function findFilterButtonSlot(input) {
        let node = input;
        for (let depth = 0; depth < 6 && node && node.parentElement; depth++) {
            const parent = node.parentElement;
            const button = [...parent.querySelectorAll('button')].find(candidate => !node.contains(candidate));
            if (button) {
                let slot = button;
                while (slot.parentElement !== parent) {
                    slot = slot.parentElement;
                }
                return slot;
            }
            node = parent;
        }
        return null;
    }

    function renderToggle(toggle) {
        toggle.setAttribute('aria-pressed', String(enabled));
        toggle.title = enabled ? 'Stop following the current file' : 'Follow the current file in the tree';
    }

    function ensureToggle() {
        if (document.getElementById(TOGGLE_ID)) {
            return;
        }
        const input = findFilterInput();
        const slot = input && findFilterButtonSlot(input);
        if (!slot) {
            return;
        }

        const toggle = document.createElement('button');
        toggle.id = TOGGLE_ID;
        toggle.type = 'button';
        toggle.setAttribute('aria-label', 'Follow the current file in the tree');

        const track = document.createElement('span');
        track.className = 'gh-follow-track';
        const knob = document.createElement('span');
        knob.className = 'gh-follow-knob';
        track.appendChild(knob);
        toggle.appendChild(track);

        toggle.addEventListener('click', () => {
            enabled = !enabled;
            writeEnabled(enabled);
            renderToggle(toggle);
            activeDiffId = null;
            if (enabled) {
                scheduleUpdate();
            } else {
                clearHighlight();
            }
        });

        renderToggle(toggle);
        slot.insertAdjacentElement('afterend', toggle);
    }

    function findTree() {
        return document.querySelector('[role="tree"]') || document.querySelector('file-tree');
    }

    function elementUnderPointer() {
        return lastPointer ? document.elementFromPoint(lastPointer.x, lastPointer.y) : null;
    }

    function findCurrentDiffId() {
        const hovered = elementUnderPointer();
        const hoveredDiffId = hovered && findDiffIdOf(hovered);
        if (hoveredDiffId) {
            return hoveredDiffId;
        }
        // Between two files (or over the tree, the header…) the pointer is on no diff:
        // keep the current file instead of jumping to the reading line and back.
        if (hovered && activeDiffId) {
            return activeDiffId;
        }
        return findDiffIdAtReadingLine();
    }

    function findDiffIdAtReadingLine() {
        const diffs = [...document.querySelectorAll('[id^="diff-"]')].filter(element => DIFF_ID_PATTERN.test(element.id));
        if (diffs.length === 0) {
            return null;
        }
        const readingLine = Math.min(220, window.innerHeight * 0.3);
        let current = diffs[0];
        for (const diff of diffs) {
            if (diff.getBoundingClientRect().top <= readingLine) {
                current = diff;
            } else {
                break;
            }
        }
        return current.id;
    }

    async function sha256(text) {
        if (!hashCache.has(text)) {
            const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
            const hex = [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
            hashCache.set(text, hex);
        }
        return hashCache.get(text);
    }

    function labelOf(treeItem) {
        const row = treeItem.firstElementChild;
        if (!row) {
            return '';
        }
        const text = row.querySelector('[class*="item-content-text"]') || row;
        return text.textContent.trim();
    }

    function pathOf(treeItem) {
        const parts = [];
        let item = treeItem;
        while (item) {
            parts.unshift(labelOf(item));
            item = item.parentElement && item.parentElement.closest('[role="treeitem"]');
        }
        return parts.join('/');
    }

    function directDiffLink(treeItem) {
        const link = treeItem.querySelector('a[href*="#diff-"]');
        if (!link) {
            return null;
        }
        return link.getAttribute('href').split('#')[1];
    }

    async function findTreeItem(tree, diffId) {
        const link = tree.querySelector(`a[href$="#${diffId}"]`);
        if (link) {
            return link.closest('[role="treeitem"], li') || link;
        }
        const hash = diffId.slice('diff-'.length);
        const items = [...tree.querySelectorAll('[role="treeitem"]')].filter(item => !item.hasAttribute('aria-expanded'));
        for (const item of items) {
            if (directDiffLink(item) === diffId) {
                return item;
            }
            const candidates = [pathOf(item)];
            if (item.id) {
                candidates.push(item.id, item.id.replace(/-item$/, ''));
            }
            for (const candidate of candidates) {
                if (candidate && await sha256(candidate) === hash) {
                    return item;
                }
            }
        }
        return null;
    }

    function clearHighlight() {
        document.querySelectorAll(`[${ACTIVE_ATTRIBUTE}]`).forEach(element => element.removeAttribute(ACTIVE_ATTRIBUTE));
    }

    function findScrollContainer(element) {
        let node = element.parentElement;
        while (node && node !== document.body) {
            const overflowY = getComputedStyle(node).overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }

    function centerInTree(treeItem) {
        const row = treeItem.firstElementChild || treeItem;
        if (row.offsetParent === null) {
            return;
        }
        const container = findScrollContainer(row);
        if (!container) {
            return;
        }
        const rowRect = row.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const top = rowRect.top - containerRect.top + container.scrollTop - (container.clientHeight - rowRect.height) / 2;
        container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }

    function highlight(treeItem, shouldCenter) {
        clearHighlight();
        treeItem.setAttribute(ACTIVE_ATTRIBUTE, '');
        if (shouldCenter) {
            centerInTree(treeItem);
        }
    }

    async function update() {
        if (!enabled || !isPullRequestFilesPage()) {
            return;
        }
        const tree = findTree();
        const diffId = findCurrentDiffId();
        if (!tree || !diffId) {
            return;
        }
        const alreadyHighlighted = tree.querySelector(`[${ACTIVE_ATTRIBUTE}]`);
        if (diffId === activeDiffId && alreadyHighlighted) {
            return;
        }
        activeDiffId = diffId;

        const treeItem = await findTreeItem(tree, diffId);
        if (!treeItem || diffId !== activeDiffId || !enabled) {
            return;
        }
        highlight(treeItem, !isPointerOverTree());
    }

    function findDiffIdOf(element) {
        let node = element.closest('[id^="diff-"]');
        while (node && !DIFF_ID_PATTERN.test(node.id)) {
            node = node.parentElement && node.parentElement.closest('[id^="diff-"]');
        }
        return node ? node.id : null;
    }

    function scheduleUpdate() {
        if (frameRequested) {
            return;
        }
        frameRequested = true;
        requestAnimationFrame(() => {
            frameRequested = false;
            update();
        });
    }

    function isPointerOverTree() {
        const hovered = elementUnderPointer();
        const tree = findTree();
        return Boolean(hovered && tree && tree.contains(hovered));
    }

    function onDomChange() {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            activeDiffId = null;
        }
        if (!isPullRequestFilesPage()) {
            return;
        }
        injectStyle();
        ensureToggle();
        scheduleUpdate();
    }

    function scheduleDomChange() {
        clearTimeout(domChangeTimer);
        domChangeTimer = setTimeout(onDomChange, 200);
    }

    document.addEventListener('mousemove', event => {
        lastPointer = { x: event.clientX, y: event.clientY };
        scheduleUpdate();
    }, { passive: true });

    document.addEventListener('scroll', event => {
        const tree = findTree();
        const target = event.target;
        const isTreeScroll = target instanceof Element && target.contains(tree) && !target.querySelector('[id^="diff-"]');
        if (tree && isTreeScroll) {
            return;
        }
        scheduleUpdate();
    }, { capture: true, passive: true });

    // GitHub swaps <body> on in-app navigation (Turbo): observe <html> so the observer survives it.
    new MutationObserver(scheduleDomChange).observe(document.documentElement, { childList: true, subtree: true });
    ['turbo:load', 'turbo:render', 'pjax:end'].forEach(name => document.addEventListener(name, scheduleDomChange));
    window.addEventListener('popstate', scheduleDomChange);

    onDomChange();
})();
