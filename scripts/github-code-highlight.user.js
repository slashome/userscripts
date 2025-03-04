// ==UserScript==
// @name         GitHub Code Background Dark Orange
// @description  Change le fond des balises code et tt dans .markdown-body en orange foncé sur GitHub.
// @version      1.0
// @namespace    https://github.com
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/scripts/github-code-highlight.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/master/scripts/github-code-highlight.user.js
// @match        https://github.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    GM_addStyle(`
        .markdown-body code,
        .markdown-body tt {
            background-color: #c56209 !important;
        }
    `);
})();