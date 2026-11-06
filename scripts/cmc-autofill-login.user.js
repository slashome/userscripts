// ==UserScript==
// @name         CMC Auto-fill login
// @description  Fill automatically the ChooseMyCompany login depending on the environment, with a test account selector on cmc.local
// @version      2.0
// @namespace    https://choosemycompany.com
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/scripts/cmc-autofill-login.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/master/scripts/cmc-autofill-login.user.js
// @match        https://preprod.choosemycompany.com/*
// @match        https://choosemycompany.com/*
// @match        https://prd.choosemycompany.com/*
// @match        https://cmc.local/*
// @grant        none
// ==/UserScript==

const DOMAIN_LOCAL = 'cmc.local';
const PASSWORD = 'Passw0rd';
const LOCAL_ACCOUNTS = [
    { email: 'super-admin@cmc.com', label: 'Super admin' },
    { email: 'tech@cmc.com', label: 'Tech' },
    { email: 'hr@cmc.com', label: 'HR CMC' },
    { email: 'sales@cmc.com', label: 'Sales' },
    { email: 'super-sales@cmc.com', label: 'Super sales' },
    { email: 'dac@cmc.com', label: 'DAC' },
    { email: 'super-dac@cmc.com', label: 'Super DAC' },
    { email: 'communication@cmc.com', label: 'Communication' },
    { email: 'accounting@cmc.com', label: 'Accounting' },
    { email: 'contact@meilleures-entreprises.fr', label: 'Meilleures Entreprises' },
    { email: 'hr@carrefour.com', label: 'Client (HR Carrefour)' },
    { email: 'consultant@4vents.com', label: 'Consultant' },
    { email: 'school@essec.com', label: 'School' },
    { email: 'partner@rekrute.com', label: 'Partner Rekrute' },
    { email: 'partner@regionsjob.com', label: 'Partner RegionsJob' },
    { email: 'journalist@lesechos.fr', label: 'Journalist' },
    { email: 'user@test.com', label: 'User' },
];
const STORAGE_KEY_LOCAL_ACCOUNT = 'cmc-autofill-login:local-account';
const STORAGE_KEY_REMOTE_EMAIL = 'cmc-autofill-login:remote-email';
const SELECTOR_ID = 'cmc-autofill-login-selector';

(function () {
    'use strict';

    const isLocal = window.location.hostname === DOMAIN_LOCAL;

    function readStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    function writeStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    function findEmailInput() {
        return document.querySelector('input[type="email"]');
    }

    function findPasswordInput() {
        return document.querySelector('input[type="password"]');
    }

    function setInputValue(input, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function fillInput(input, value, overwrite) {
        if (!input || !value) {
            return;
        }
        if (overwrite || input.value === '') {
            setInputValue(input, value);
        }
    }

    function fillCredentials(email, overwrite) {
        fillInput(findEmailInput(), email, overwrite);
        fillInput(findPasswordInput(), PASSWORD, overwrite);
    }

    function selectedLocalEmail() {
        const storedEmail = readStorage(STORAGE_KEY_LOCAL_ACCOUNT);
        const isKnownAccount = LOCAL_ACCOUNTS.some((account) => account.email === storedEmail);
        return isKnownAccount ? storedEmail : LOCAL_ACCOUNTS[0].email;
    }

    function createAccountSelector() {
        const selector = document.createElement('select');
        selector.id = SELECTOR_ID;
        selector.title = 'CMC local test account';
        Object.assign(selector.style, {
            position: 'fixed',
            top: '12px',
            right: '12px',
            zIndex: '2147483647',
            padding: '6px 8px',
            font: '13px system-ui, sans-serif',
            color: '#1b1b1f',
            background: '#ffffff',
            border: '1px solid #8a8a99',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        });

        for (const account of LOCAL_ACCOUNTS) {
            const option = document.createElement('option');
            option.value = account.email;
            option.textContent = `${account.label} — ${account.email}`;
            selector.append(option);
        }

        selector.value = selectedLocalEmail();
        selector.addEventListener('change', () => {
            writeStorage(STORAGE_KEY_LOCAL_ACCOUNT, selector.value);
            fillCredentials(selector.value, true);
        });

        return selector;
    }

    function syncAccountSelector() {
        const existingSelector = document.getElementById(SELECTOR_ID);
        const hasLoginForm = Boolean(findEmailInput());

        if (hasLoginForm && !existingSelector) {
            document.body.append(createAccountSelector());
        }
        if (!hasLoginForm && existingSelector) {
            existingSelector.remove();
        }
    }

    function rememberRemoteEmail() {
        const emailInput = findEmailInput();
        if (emailInput && emailInput.value !== '') {
            writeStorage(STORAGE_KEY_REMOTE_EMAIL, emailInput.value);
        }
    }

    function sync() {
        if (isLocal) {
            syncAccountSelector();
            fillCredentials(selectedLocalEmail(), false);
            return;
        }
        fillCredentials(readStorage(STORAGE_KEY_REMOTE_EMAIL), false);
    }

    if (!isLocal) {
        document.addEventListener('submit', rememberRemoteEmail, true);
    }

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();
})();
