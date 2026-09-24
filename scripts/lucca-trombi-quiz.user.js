// ==UserScript==
// @name         Lucca - Quiz du trombinoscope
// @description  Ajoute un bouton à côté de "Organigramme" qui lance un quiz : les photos du trombinoscope Lucca défilent une par une et il faut retrouver le prénom (1 point) et le nom (3 points pour les deux).
// @version      1.0.0
// @namespace    https://ilucca.net
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/main/scripts/lucca-trombi-quiz.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/main/scripts/lucca-trombi-quiz.user.js
// @match        *://*.ilucca.net/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const HIDDEN_NAMES_STORAGE_KEY = 'lucca-trombi-hidden-names';
    const TILE_SELECTOR = 'li[trombi-user-tile]';
    const TILE_NAME_SELECTOR = '.employeeTile-infos h4';
    const TILE_PICTURE_SELECTOR = '.employeeTile-picture img';
    const HEADER_ACTIONS_SELECTOR = '.pageHeader-content-actions';
    const ORG_CHART_LINK_SELECTOR = `${HEADER_ACTIONS_SELECTOR} a[href="/directory/employee-organization"]`;
    const QUIZ_BUTTON_ID = 'lucca-trombi-quiz-button';
    const QUIZ_OVERLAY_ID = 'lucca-trombi-quiz-overlay';
    const STYLE_ID = 'lucca-trombi-quiz-style';
    const FIRST_NAME_POINTS = 1;
    const FULL_NAME_POINTS = 3;
    const QUIZ_PICTURE_WIDTH = '400';

    const QUESTION_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

    let refreshTimer = null;

    function loadHiddenNames() {
        try {
            const stored = JSON.parse(localStorage.getItem(HIDDEN_NAMES_STORAGE_KEY));
            return new Set(Array.isArray(stored) ? stored : []);
        } catch {
            return new Set();
        }
    }

    function isUpperCaseWord(word) {
        return word === word.toLocaleUpperCase() && word !== word.toLocaleLowerCase();
    }

    function splitFullName(fullName) {
        const words = fullName.split(/\s+/);
        const lastNameWords = words.filter(isUpperCaseWord);
        const firstNameWords = words.filter(word => !isUpperCaseWord(word));

        if (!lastNameWords.length || !firstNameWords.length) {
            return { firstName: words[0], lastName: words.slice(1).join(' ') };
        }
        return { firstName: firstNameWords.join(' '), lastName: lastNameWords.join(' ') };
    }

    function normalizeName(name) {
        return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
    }

    function scoreAnswer(person, firstName, lastName) {
        if (normalizeName(firstName) !== normalizeName(person.firstName)) return 0;
        return normalizeName(lastName) === normalizeName(person.lastName) ? FULL_NAME_POINTS : FIRST_NAME_POINTS;
    }

    function largePictureUrl(src) {
        const url = new URL(src, location.href);
        url.searchParams.set('width', QUIZ_PICTURE_WIDTH);
        return url.href;
    }

    function shuffle(items) {
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        return items;
    }

    function collectPeople() {
        const hiddenNames = loadHiddenNames();
        const people = new Map();

        document.querySelectorAll(TILE_SELECTOR).forEach(tile => {
            const nameElement = tile.querySelector(TILE_NAME_SELECTOR);
            const picture = tile.querySelector(TILE_PICTURE_SELECTOR);
            const fullName = nameElement ? nameElement.textContent.trim() : '';

            if (!fullName || !picture || !picture.src || hiddenNames.has(fullName) || people.has(fullName)) return;

            people.set(fullName, { fullName, ...splitFullName(fullName), pictureUrl: largePictureUrl(picture.src) });
        });

        return shuffle([...people.values()]);
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${QUIZ_BUTTON_ID} { margin-left: 8px; }
            #${QUIZ_BUTTON_ID} .lucca-trombi-quiz-button-icon { display: inline-flex; margin-right: 6px; }
            #${QUIZ_OVERLAY_ID} {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f5f6fa;
                color: #33415c;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-score {
                position: absolute;
                top: 24px;
                left: 24px;
                font-size: 24px;
                font-weight: 700;
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-close {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 999px;
                background: transparent;
                color: inherit;
                font-size: 28px;
                line-height: 1;
                cursor: pointer;
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-close:hover { background: #e6e8ef; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                width: min(360px, calc(100vw - 32px));
                padding: 24px;
                border-radius: 16px;
                background: #ffffff;
                box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12);
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-progress { font-size: 13px; color: #6b7a99; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-picture {
                width: 240px;
                height: 240px;
                border-radius: 12px;
                object-fit: cover;
                background: #e6e8ef;
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-inputs { display: flex; flex-direction: column; gap: 8px; width: 100%; }
            #${QUIZ_OVERLAY_ID} input {
                box-sizing: border-box;
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #d8dce6;
                border-radius: 8px;
                font: inherit;
                font-size: 15px;
            }
            #${QUIZ_OVERLAY_ID} input:focus { outline: 2px solid #a48ce8; border-color: #a48ce8; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-feedback { min-height: 20px; font-size: 15px; font-weight: 600; text-align: center; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-feedback.is-success { color: #1f8a4c; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-feedback.is-partial { color: #b7791f; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-feedback.is-error { color: #c53030; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-submit {
                width: 100%;
                padding: 10px 14px;
                border: none;
                border-radius: 8px;
                background: #5b3cc4;
                color: #ffffff;
                font: inherit;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-submit:hover { background: #4a2fa8; }
        `;
        document.head.appendChild(style);
    }

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = QUIZ_OVERLAY_ID;
        overlay.innerHTML = `
            <div class="lucca-trombi-quiz-score"></div>
            <button type="button" class="lucca-trombi-quiz-close" aria-label="Fermer le quiz">×</button>
            <form class="lucca-trombi-quiz-card">
                <div class="lucca-trombi-quiz-progress"></div>
                <img class="lucca-trombi-quiz-picture" alt="">
                <div class="lucca-trombi-quiz-inputs">
                    <input name="firstName" placeholder="Prénom" autocomplete="off" spellcheck="false">
                    <input name="lastName" placeholder="Nom" autocomplete="off" spellcheck="false">
                </div>
                <div class="lucca-trombi-quiz-feedback"></div>
                <button type="submit" class="lucca-trombi-quiz-submit"></button>
            </form>
        `;
        return overlay;
    }

    function startQuiz() {
        const people = collectPeople();
        if (!people.length) return;

        closeQuiz();

        const overlay = createOverlay();
        const scoreElement = overlay.querySelector('.lucca-trombi-quiz-score');
        const form = overlay.querySelector('form');
        const progress = overlay.querySelector('.lucca-trombi-quiz-progress');
        const picture = overlay.querySelector('.lucca-trombi-quiz-picture');
        const inputs = overlay.querySelector('.lucca-trombi-quiz-inputs');
        const firstNameInput = form.elements.firstName;
        const lastNameInput = form.elements.lastName;
        const feedback = overlay.querySelector('.lucca-trombi-quiz-feedback');
        const submit = overlay.querySelector('.lucca-trombi-quiz-submit');

        const maxScore = people.length * FULL_NAME_POINTS;
        let index = 0;
        let score = 0;
        let answered = false;

        function renderScore() {
            scoreElement.textContent = `Score : ${score} / ${maxScore}`;
        }

        function renderFeedback(points, person) {
            const outcomes = {
                [FULL_NAME_POINTS]: { className: 'is-success', label: `Bravo ! +${FULL_NAME_POINTS}` },
                [FIRST_NAME_POINTS]: { className: 'is-partial', label: `Prénom trouvé, +${FIRST_NAME_POINTS}` },
                0: { className: 'is-error', label: 'Raté' },
            };
            const outcome = outcomes[points];
            feedback.className = `lucca-trombi-quiz-feedback ${outcome.className}`;
            feedback.textContent = `${outcome.label} — ${person.fullName}`;
        }

        function renderQuestion() {
            const person = people[index];
            answered = false;
            progress.textContent = `${index + 1} / ${people.length}`;
            picture.src = person.pictureUrl;
            picture.style.display = '';
            inputs.style.display = '';
            firstNameInput.value = '';
            lastNameInput.value = '';
            firstNameInput.disabled = false;
            lastNameInput.disabled = false;
            feedback.className = 'lucca-trombi-quiz-feedback';
            feedback.textContent = '';
            submit.textContent = 'Valider';
            renderScore();
            firstNameInput.focus();
        }

        function renderEnd() {
            progress.textContent = 'Terminé !';
            picture.style.display = 'none';
            inputs.style.display = 'none';
            feedback.className = 'lucca-trombi-quiz-feedback is-success';
            feedback.textContent = `Score final : ${score} / ${maxScore}`;
            submit.textContent = 'Rejouer';
            renderScore();
            submit.focus();
        }

        function answer() {
            const person = people[index];
            const points = scoreAnswer(person, firstNameInput.value, lastNameInput.value);
            score += points;
            answered = true;
            firstNameInput.disabled = true;
            lastNameInput.disabled = true;
            renderFeedback(points, person);
            submit.textContent = index + 1 < people.length ? 'Suivant' : 'Voir le score';
            renderScore();
            submit.focus();
        }

        form.addEventListener('submit', event => {
            event.preventDefault();
            if (index >= people.length) {
                startQuiz();
            } else if (!answered) {
                answer();
            } else {
                index++;
                if (index < people.length) renderQuestion();
                else renderEnd();
            }
        });

        overlay.querySelector('.lucca-trombi-quiz-close').addEventListener('click', closeQuiz);
        overlay.addEventListener('keydown', event => {
            event.stopPropagation();
            if (event.key === 'Escape') closeQuiz();
        });

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        renderQuestion();
    }

    function closeQuiz() {
        const overlay = document.getElementById(QUIZ_OVERLAY_ID);
        if (!overlay) return;
        overlay.remove();
        document.body.style.overflow = '';
    }

    function createQuizButton() {
        const button = document.createElement('button');
        button.id = QUIZ_BUTTON_ID;
        button.type = 'button';
        button.className = 'button mod-outlined palette-none is-default';

        const icon = document.createElement('span');
        icon.className = 'lucca-trombi-quiz-button-icon';
        icon.innerHTML = QUESTION_ICON;

        const label = document.createElement('span');
        label.textContent = 'Quiz';

        button.appendChild(icon);
        button.appendChild(label);
        button.addEventListener('click', startQuiz);

        return button;
    }

    function syncQuizButton() {
        const orgChartLink = document.querySelector(ORG_CHART_LINK_SELECTOR);
        let button = document.getElementById(QUIZ_BUTTON_ID);

        if (!orgChartLink) {
            if (button) button.remove();
            return;
        }

        if (!button) button = createQuizButton();

        const actions = orgChartLink.closest(HEADER_ACTIONS_SELECTOR);
        if (actions.lastElementChild !== button) actions.appendChild(button);

        const disabled = !document.querySelector(TILE_SELECTOR);
        if (button.disabled !== disabled) button.disabled = disabled;
    }

    function refresh() {
        injectStyle();
        syncQuizButton();
    }

    function scheduleRefresh() {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(refresh, 100);
    }

    const bodyObserver = new MutationObserver(scheduleRefresh);
    bodyObserver.observe(document.body, { childList: true, subtree: true });

    refresh();
})();
