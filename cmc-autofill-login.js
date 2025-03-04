// ==UserScript==
// @name         CMC Auto-fill login
// @description  Fill automatically the ChooseMyCompany login depending on the environment
// @version      1.0
// @namespace    https://choosemycompany.com
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/cmc-autofill-login.js
// @match        https://preprod.choosemycompany.com/*
// @match        https://choosemycompany.com/*
// @match        https://prd.choosemycompany.com/*
// @match        https://cmc.local/*
// @grant        none
// ==/UserScript==

const DOMAIN_LOCAL = 'cmc.local'

(function() {
    'use strict';

    let email = 'florian.boulestreau@choosemycompany.com';
    const pass = 'Passw0rd';
    const currentDomain = window.location.hostname;
    const isLocal = currentDomain === DOMAIN_LOCAL
    if (isLocal) {
        email = 'super-admin@cmc.com'
    }

    function fillEmailInput() {
        let emailInput = document.querySelector('input[type="email"]');
        let passInput = document.querySelector('input[type="password"]');

        if (emailInput && emailInput.value === '') {
            emailInput.value = email;
        }

        if (passInput && passInput.value === '') {
            passInput.value = pass;
        }

    }
    const observer = new MutationObserver(() => {
        fillEmailInput();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    fillEmailInput();
})();