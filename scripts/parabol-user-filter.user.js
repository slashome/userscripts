// ==UserScript==
// @name         Parabol - Filtre d'utilisateurs
// @description  Ajoute un sélecteur pour afficher uniquement les cartes d'un utilisateur sur Parabol
// @version      2.0.0
// @namespace    https://parabol.co
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/main/scripts/parabol-user-filter.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/main/scripts/parabol-user-filter.user.js
// @match        https://*.parabol.co/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parabol.co
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const CARD_SELECTOR = '[data-droppable]';
  const AUTHOR_SELECTOR = '.text-fg-secondary.font-semibold';
  const CONTAINER_ID = 'parabol-user-filter';

  let selectedUser = '';
  let knownUsers = '';

  function getCardAuthors(card) {
    return Array.from(card.querySelectorAll(AUTHOR_SELECTOR))
      .map(el => el.textContent.trim())
      .filter(Boolean);
  }

  function getUsers() {
    const names = new Set();
    document.querySelectorAll(CARD_SELECTOR).forEach(card => {
      getCardAuthors(card).forEach(name => names.add(name));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  function applyFilter() {
    document.querySelectorAll(CARD_SELECTOR).forEach(card => {
      const authors = getCardAuthors(card);
      const visible = !selectedUser || authors.length === 0 || authors.includes(selectedUser);
      card.style.display = visible ? '' : 'none';
    });
  }

  function createContainer() {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;
    Object.assign(container.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: '9999',
      background: '#fff',
      color: '#000',
      border: '1px solid #ccc',
      padding: '5px 10px',
      borderRadius: '5px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      fontSize: '14px',
    });

    const label = document.createElement('label');
    label.textContent = 'Filtrer : ';
    label.style.marginRight = '5px';

    const select = document.createElement('select');
    select.addEventListener('change', event => {
      selectedUser = event.target.value;
      applyFilter();
    });

    label.appendChild(select);
    container.appendChild(label);
    document.body.appendChild(container);
    return container;
  }

  function renderOptions(select, users) {
    select.replaceChildren();

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Tous les utilisateurs --';
    select.appendChild(defaultOption);

    users.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    if (selectedUser && !users.includes(selectedUser)) {
      selectedUser = '';
    }
    select.value = selectedUser;
  }

  function refresh() {
    const users = getUsers();
    let container = document.getElementById(CONTAINER_ID);

    if (users.length === 0) {
      if (container) container.style.display = 'none';
      return;
    }

    if (!container) container = createContainer();
    container.style.display = '';

    const signature = users.join('\n');
    if (signature !== knownUsers) {
      knownUsers = signature;
      renderOptions(container.querySelector('select'), users);
    }

    applyFilter();
  }

  let scheduled = null;
  const observer = new MutationObserver(mutations => {
    const container = document.getElementById(CONTAINER_ID);
    if (container && mutations.every(m => container.contains(m.target))) return;
    clearTimeout(scheduled);
    scheduled = setTimeout(refresh, 200);
  });

  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  refresh();
})();
