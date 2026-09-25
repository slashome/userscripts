// ==UserScript==
// @name         Lucca - Quiz du trombinoscope
// @description  Ajoute un bouton à côté de "Organigramme" qui lance un quiz : les photos du trombinoscope Lucca défilent une par une et il faut retrouver le prénom (1 point) et le nom (3 points pour les deux).
// @version      1.2.0
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
    const USERS_API_URL = '/api/v3/users/scope';
    const USERS_API_PAGE_SIZE = 100;
    const USERS_API_PARAMS = {
        appInstanceId: '5',
        operations: '1',
        fields: 'id,name,firstName,lastName,picture[id],collection.count',
        orderBy: 'lastName,asc,firstName,asc',
    };
    const HEADER_ACTIONS_SELECTOR = '.pageHeader-content-actions';
    const ORG_CHART_LINK_SELECTOR = `${HEADER_ACTIONS_SELECTOR} a[href="/directory/employee-organization"]`;
    const QUIZ_BUTTON_ID = 'lucca-trombi-quiz-button';
    const QUIZ_OVERLAY_ID = 'lucca-trombi-quiz-overlay';
    const STYLE_ID = 'lucca-trombi-quiz-style';
    const FIRST_NAME_POINTS = 1;
    const FULL_NAME_POINTS = 3;
    const QUIZ_PICTURE_WIDTH = '400';

    const QUIZ_LOGO = `
        <svg class="lucca-trombi-quiz-logo" viewBox="0 -2 200 124" role="img" aria-label="Qui est-ce ?">
            <defs>
                <g id="lucca-trombi-quiz-logo-text" font-family="'Arial Rounded MT Bold', 'Arial Black', sans-serif" font-weight="900" text-anchor="middle" transform="rotate(-6 100 60)">
                    <text x="106" y="61" font-size="50">Qui</text>
                    <text x="84" y="103" font-size="42">Est-ce</text>
                    <text x="168" y="105" font-size="84">?</text>
                </g>
            </defs>
            <use href="#lucca-trombi-quiz-logo-text" fill="#1d4f9c" stroke="#1d4f9c" stroke-width="16" stroke-linejoin="round"></use>
            <use href="#lucca-trombi-quiz-logo-text" fill="#ffffff" stroke="#ffffff" stroke-width="9" stroke-linejoin="round"></use>
            <use href="#lucca-trombi-quiz-logo-text" fill="#e3161f" stroke="#b30d15" stroke-width="1" stroke-linejoin="round"></use>
        </svg>
    `;

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

    function normalizeName(name) {
        return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
    }

    function isSameName(guess, expected) {
        return normalizeName(guess) === normalizeName(expected);
    }

    function scoreAnswer(firstNameFound, lastNameFound) {
        if (!firstNameFound) return 0;
        return lastNameFound ? FULL_NAME_POINTS : FIRST_NAME_POINTS;
    }

    function pictureUrl(userId) {
        return `/directory/api/employees/${userId}/picture?a=0&width=${QUIZ_PICTURE_WIDTH}`;
    }

    function shuffle(items) {
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }
        return items;
    }

    async function fetchUsersPage(offset) {
        const params = new URLSearchParams({ ...USERS_API_PARAMS, paging: `${offset},${USERS_API_PAGE_SIZE}` });
        const response = await fetch(`${USERS_API_URL}?${params}`, {
            credentials: 'include',
            headers: { accept: 'application/json' },
        });
        if (!response.ok) throw new Error(`Lucca API responded ${response.status}`);

        const { data } = await response.json();
        return data;
    }

    async function fetchAllUsers() {
        const users = [];
        for (let offset = 0; ; offset += USERS_API_PAGE_SIZE) {
            const { items, count } = await fetchUsersPage(offset);
            users.push(...items);
            if (items.length < USERS_API_PAGE_SIZE || users.length >= count) return users;
        }
    }

    async function collectPeople() {
        const hiddenNames = loadHiddenNames();
        const users = await fetchAllUsers();

        const people = users
            .filter(user => user.picture && !hiddenNames.has(user.name))
            .map(user => ({
                fullName: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                pictureUrl: pictureUrl(user.id),
            }));

        return shuffle(people);
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
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 16px;
                box-sizing: border-box;
                padding: 16px;
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
                box-sizing: border-box;
                width: min(360px, 100%);
                min-height: 0;
                padding: 24px;
                border-radius: 16px;
                background: #ffffff;
                box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12);
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-card.is-end { width: min(1100px, 100%); padding: 32px; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-card.is-end .lucca-trombi-quiz-feedback { font-size: 22px; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-card.is-end .lucca-trombi-quiz-submit { max-width: 320px; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-logo { flex-shrink: 0; width: 200px; height: auto; }
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
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-recap {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr));
                gap: 8px 24px;
                box-sizing: border-box;
                width: 100%;
                min-height: 0;
                margin: 0;
                padding: 0;
                overflow-y: auto;
                list-style: none;
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-recap li { display: flex; align-items: center; gap: 10px; font-size: 14px; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-recap img {
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                object-fit: cover;
                background: #e6e8ef;
            }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-recap-name { flex: 1; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-recap-missed { padding: 0 3px; border-radius: 4px; background: #fed7d7; color: #c53030; font-weight: 600; }
            #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-recap-points { font-weight: 700; color: #6b7a99; }
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
            @media (max-width: 640px) {
                #${QUIZ_OVERLAY_ID} { justify-content: flex-start; padding-top: 72px; }
                #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-logo { width: 160px; }
                #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-card.is-end { padding: 20px; }
                #${QUIZ_OVERLAY_ID} .lucca-trombi-quiz-picture { width: 200px; height: 200px; }
            }
        `;
        document.head.appendChild(style);
    }

    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = QUIZ_OVERLAY_ID;
        overlay.innerHTML = `
            <div class="lucca-trombi-quiz-score"></div>
            <button type="button" class="lucca-trombi-quiz-close" aria-label="Fermer le quiz">×</button>
            ${QUIZ_LOGO}
            <form class="lucca-trombi-quiz-card">
                <div class="lucca-trombi-quiz-progress"></div>
                <img class="lucca-trombi-quiz-picture" alt="">
                <div class="lucca-trombi-quiz-inputs">
                    <input name="firstName" placeholder="Prénom" autocomplete="off" spellcheck="false">
                    <input name="lastName" placeholder="Nom" autocomplete="off" spellcheck="false">
                </div>
                <div class="lucca-trombi-quiz-feedback"></div>
                <ul class="lucca-trombi-quiz-recap"></ul>
                <button type="submit" class="lucca-trombi-quiz-submit"></button>
            </form>
        `;
        return overlay;
    }

    async function startQuiz() {
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
        const recap = overlay.querySelector('.lucca-trombi-quiz-recap');
        const submit = overlay.querySelector('.lucca-trombi-quiz-submit');

        let people = [];
        const results = [];
        let maxScore = 0;
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

        function renderMessage(message, className) {
            form.classList.remove('is-end');
            progress.textContent = '';
            picture.style.display = 'none';
            inputs.style.display = 'none';
            recap.style.display = 'none';
            submit.style.display = 'none';
            feedback.className = `lucca-trombi-quiz-feedback ${className}`;
            feedback.textContent = message;
        }

        function renderQuestion() {
            const person = people[index];
            answered = false;
            form.classList.remove('is-end');
            progress.textContent = `${index + 1} / ${people.length}`;
            picture.src = person.pictureUrl;
            picture.style.display = '';
            inputs.style.display = '';
            recap.style.display = 'none';
            submit.style.display = '';
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

        function renderNamePart(name, found) {
            const part = document.createElement('span');
            part.textContent = name;
            if (!found) part.className = 'lucca-trombi-quiz-recap-missed';
            return part;
        }

        function renderRecap() {
            recap.replaceChildren(...results.map(({ person, firstNameFound, lastNameFound, points }) => {
                const item = document.createElement('li');

                const thumbnail = document.createElement('img');
                thumbnail.src = person.pictureUrl;
                thumbnail.alt = '';

                const name = document.createElement('span');
                name.className = 'lucca-trombi-quiz-recap-name';
                name.append(renderNamePart(person.firstName, firstNameFound), ' ', renderNamePart(person.lastName, lastNameFound));

                const pointsElement = document.createElement('span');
                pointsElement.className = 'lucca-trombi-quiz-recap-points';
                pointsElement.textContent = `+${points}`;

                item.append(thumbnail, name, pointsElement);
                return item;
            }));
            recap.style.display = '';
        }

        function renderEnd() {
            form.classList.add('is-end');
            progress.textContent = 'Terminé !';
            picture.style.display = 'none';
            inputs.style.display = 'none';
            feedback.className = 'lucca-trombi-quiz-feedback is-success';
            feedback.textContent = `Score final : ${score} / ${maxScore}`;
            renderRecap();
            submit.textContent = 'Rejouer';
            renderScore();
            submit.focus();
        }

        function answer() {
            const person = people[index];
            const firstNameFound = isSameName(firstNameInput.value, person.firstName);
            const lastNameFound = isSameName(lastNameInput.value, person.lastName);
            const points = scoreAnswer(firstNameFound, lastNameFound);
            results.push({ person, firstNameFound, lastNameFound, points });
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
            if (!people.length) return;
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
        renderMessage('Chargement des collaborateurs…', '');

        try {
            people = await collectPeople();
        } catch {
            renderMessage('Impossible de charger les collaborateurs depuis Lucca.', 'is-error');
            return;
        }
        if (!overlay.isConnected) return;
        if (!people.length) {
            renderMessage('Aucun collaborateur avec photo à deviner.', 'is-error');
            return;
        }

        maxScore = people.length * FULL_NAME_POINTS;
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
