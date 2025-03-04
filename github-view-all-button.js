// ==UserScript==
// @name         Add a "View all" button in GitHub Review
// @description  Adds a "View all" button to check all "Viewed" checkboxes in a GitHub review page
// @version      1.0
// @namespace    https://github.com
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/github-view-all-button.js
// @match        https://github.com/*/*/pull/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function markViewed() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"][name="viewed"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                checkbox.click();
            }
        });
    }

    function addButton() {
        const header = document.querySelector('.diffbar.details-collapse');
        if (header && !document.getElementById('view-all-button')) {
            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('diffbar-item', 'dropdown', 'js-reviews-container');
            buttonContainer.style.marginLeft = '8px';

            const button = document.createElement('a');
            button.href = '#';
            button.id = 'view-all-button';
            button.setAttribute('aria-label', 'Mark all checkboxes as viewed');
            button.classList.add('Button--danger', 'Button--small', 'Button', 'd-none', 'd-sm-none', 'd-md-none', 'd-lg-inline-flex', 'd-xl-inline-flex', 'mr-2');

            const buttonContent = document.createElement('span');
            buttonContent.classList.add('Button-content');

            const buttonLabel = document.createElement('span');
            buttonLabel.classList.add('Button-label');
            buttonLabel.innerText = 'View all';

            buttonContent.appendChild(buttonLabel);
            button.appendChild(buttonContent);
            buttonContainer.appendChild(button);

            button.addEventListener('click', (e) => {
                e.preventDefault();
                markViewed();
            });

            header.appendChild(buttonContainer);
        }
    }

    const observer = new MutationObserver(addButton);
    observer.observe(document.body, { childList: true, subtree: true });

    addButton();
})();