// ==UserScript==
// @name         Lucca - Toggle absents du planning
// @description  Ajoute un bouton pour masquer/afficher les collaborateurs qui ne sont pas au bureau aujourd'hui (télétravail ou congé) sur le planning des absences Lucca.
// @version      1.0.0
// @namespace    https://ilucca.net
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/scripts/lucca-planning-toggle.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/master/scripts/lucca-planning-toggle.user.js
// @match        *://*.ilucca.net/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const TABLE_SELECTOR = 'table[aria-label="Planning des absences"]';
    const BUTTON_ID = 'lucca-planning-toggle-button';

    let hideAbsent = false;
    let observedTbody = null;
    let reapplyTimer = null;

    function findTodayColumnIndex() {
        const dayHeaderCells = document.querySelectorAll('tr.table-head-rowDays th.table-head-row-cell');
        for (let i = 0; i < dayHeaderCells.length; i++) {
            if (dayHeaderCells[i].querySelector('.table-head-rowDays-today')) {
                return i;
            }
        }
        return -1;
    }

    function isAbsentToday(userRow, todayIndex) {
        const dayCells = userRow.querySelectorAll('td.table-body-row-cell');
        const todayCell = dayCells[todayIndex];
        if (!todayCell) return false;

        const halves = todayCell.querySelectorAll('.table-body-row-cell-day-half');
        return Array.from(halves).some(half => !half.classList.contains('is-off'));
    }

    function applyFilter() {
        const table = document.querySelector(TABLE_SELECTOR);
        if (!table) return;

        const todayIndex = findTodayColumnIndex();
        const rows = Array.from(table.querySelectorAll('tbody > tr'));

        let deptGroupRows = [];
        let deptGroupHasVisibleUser = false;
        let inDeptGroup = false;

        function closeDeptGroup() {
            if (deptGroupRows.length) {
                const display = deptGroupHasVisibleUser ? '' : 'none';
                deptGroupRows.forEach(row => { row.style.display = display; });
            }
            deptGroupRows = [];
            deptGroupHasVisibleUser = false;
        }

        rows.forEach(row => {
            if (row.classList.contains('table-body-rowDepartment')) {
                if (!inDeptGroup) {
                    closeDeptGroup();
                    inDeptGroup = true;
                }
                deptGroupRows.push(row);
            } else if (row.classList.contains('table-body-rowUser')) {
                inDeptGroup = false;
                const absent = todayIndex !== -1 && isAbsentToday(row, todayIndex);
                const visible = !(hideAbsent && absent);
                row.style.display = visible ? '' : 'none';
                if (visible) deptGroupHasVisibleUser = true;
            }
        });

        closeDeptGroup();
    }

    function updateButtonLabel(button) {
        const label = button.querySelector('.lucca-planning-toggle-label');
        const icon = button.querySelector('.lucca-planning-toggle-icon');

        label.textContent = hideAbsent ? 'Afficher tout le monde' : 'Masquer les indisponibles';
        icon.innerHTML = hideAbsent ? EYE_OFF_ICON : EYE_ICON;

        button.style.background = hideAbsent ? '#f1edfb' : '#ffffff';
        button.style.borderColor = hideAbsent ? '#a48ce8' : '#d8dce6';
        button.style.color = hideAbsent ? '#5b3cc4' : '#33415c';
    }

    const EYE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    const EYE_OFF_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a18.6 18.6 0 0 1 4.22-5.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

    function createButton() {
        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        button.style.position = 'fixed';
        button.style.top = '72px';
        button.style.right = '24px';
        button.style.zIndex = '9999';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.gap = '6px';
        button.style.padding = '7px 14px';
        button.style.border = '1px solid #d8dce6';
        button.style.borderRadius = '999px';
        button.style.background = '#ffffff';
        button.style.color = '#33415c';
        button.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        button.style.fontSize = '13px';
        button.style.fontWeight = '500';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 1px 4px rgba(15, 23, 42, 0.12)';
        button.style.transition = 'background-color .15s ease, border-color .15s ease, color .15s ease';

        const icon = document.createElement('span');
        icon.className = 'lucca-planning-toggle-icon';
        icon.style.display = 'inline-flex';

        const label = document.createElement('span');
        label.className = 'lucca-planning-toggle-label';

        button.appendChild(icon);
        button.appendChild(label);

        button.addEventListener('click', () => {
            hideAbsent = !hideAbsent;
            updateButtonLabel(button);
            applyFilter();
        });

        updateButtonLabel(button);

        return button;
    }

    function attachTbodyObserver(table) {
        const tbody = table.querySelector('tbody');
        if (!tbody || tbody === observedTbody) return;

        observedTbody = tbody;
        const observer = new MutationObserver(() => {
            clearTimeout(reapplyTimer);
            reapplyTimer = setTimeout(applyFilter, 100);
        });
        observer.observe(tbody, { childList: true, subtree: true });
    }

    function ensureButton() {
        const table = document.querySelector(TABLE_SELECTOR);
        let button = document.getElementById(BUTTON_ID);

        if (!table) {
            if (button) button.style.display = 'none';
            return;
        }

        if (!button) {
            button = createButton();
            document.body.appendChild(button);
        }

        button.style.display = 'flex';
        attachTbodyObserver(table);

        if (hideAbsent) applyFilter();
    }

    const bodyObserver = new MutationObserver(() => ensureButton());
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    ensureButton();
})();
