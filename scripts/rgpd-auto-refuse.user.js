// ==UserScript==
// @name         RGPD Auto-Refuse
// @description  Automatically refuses all toggles in RGPD/GDPR cookie consent modals and confirms the choice. Designed to be extended with handlers for any consent provider.
// @version      1.0.0
// @namespace    https://github.com/slashome
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/scripts/rgpd-auto-refuse.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/master/scripts/rgpd-auto-refuse.user.js
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const LOG_PREFIX = '[RGPD Auto-Refuse]';

    function log(...args) {
        console.log(LOG_PREFIX, ...args);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function isDisplayed(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function waitForElement(selector, { timeout = 5000, root = document, visible = false } = {}) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            (function check() {
                const el = root.querySelector(selector);
                if (el && (!visible || isDisplayed(el))) {
                    resolve(el);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                } else {
                    setTimeout(check, 100);
                }
            })();
        });
    }

    // -------------------------------------------------------------------------
    // Handlers
    //
    // Each handler describes how to deal with one consent-modal flavor. Add a
    // new one by appending an object with:
    //   - name:    label for logs
    //   - detect:  () => Element | null   — return the modal root if present
    //   - handle:  async (root) => void   — refuse everything and confirm
    // -------------------------------------------------------------------------

    const handlers = [
        {
            name: 'Funding Choices',
            detect: () => document.querySelector('.fc-consent-root'),
            handle: async (root) => {
                // If we're on the initial choice screen, open "Manage options".
                const choiceDialog = root.querySelector('.fc-choice-dialog');
                if (choiceDialog && isDisplayed(choiceDialog)) {
                    const manageBtn = root.querySelector('.fc-cta-manage-options');
                    if (manageBtn) {
                        log('Opening manage options');
                        manageBtn.click();
                        await sleep(300);
                    }
                }

                await waitForElement('.fc-data-preferences-dialog', { root, visible: true });

                // Legitimate interest toggles are checked by default — uncheck them.
                let li = 0;
                root.querySelectorAll('input.fc-preference-legitimate-interest').forEach(input => {
                    if (input.checked) { input.click(); li++; }
                });
                // Consent toggles should already be unchecked, but enforce it.
                let cs = 0;
                root.querySelectorAll('input.fc-preference-consent').forEach(input => {
                    if (input.checked) { input.click(); cs++; }
                });
                log(`Refused ${li} legitimate interest, ${cs} consent toggle(s)`);

                await sleep(150);

                const dataPrefs = root.querySelector('.fc-data-preferences-dialog');
                const confirmBtn =
                    (dataPrefs && isDisplayed(dataPrefs) && dataPrefs.querySelector('.fc-confirm-choices')) ||
                    root.querySelector('.fc-confirm-choices');

                if (confirmBtn) {
                    log('Confirming choices');
                    confirmBtn.click();
                } else {
                    throw new Error('Confirm button not found');
                }
            },
        },

        // Add additional handlers below as new consent providers are encountered.
    ];

    // -------------------------------------------------------------------------
    // Dispatcher
    // -------------------------------------------------------------------------

    let inProgress = false;

    async function tryHandle() {
        if (inProgress) return;
        for (const handler of handlers) {
            const root = handler.detect();
            if (!root) continue;
            inProgress = true;
            log(`Handling ${handler.name} modal`);
            try {
                await handler.handle(root);
            } catch (err) {
                log(`${handler.name} handler failed:`, err);
            } finally {
                inProgress = false;
            }
            return;
        }
    }

    const observer = new MutationObserver(() => { tryHandle(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    tryHandle();
})();
