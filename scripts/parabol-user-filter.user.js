// ==UserScript==
// @name         Parabol - Filtre d'utilisateurs
// @description  Ajoute un sélecteur pour afficher uniquement les cartes d'un utilisateur sur Parabol
// @version      1.0.1
// @namespace    https://parabol.co
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/scripts/parabol-user-filter.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/master/scripts/parabol-user-filter.user.js
// @match        parabol.co/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=parabol.co
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function getUserElements() {
    const userElements = Array.from(document.querySelectorAll('div.py-1.text-slate-600'))
      .map(el => {
        const name = el.textContent?.trim();
        if (!name) return null;
        return { name, element: el };
      })
      .filter(Boolean)
      .filter((item, index, self) => {
        return self.findIndex(i => i.name === item.name) === index;
      });

    return userElements;
  }

function filterCardsByUser(userName) {
  const cards = document.querySelectorAll('[data-cy*="-card-"]'); // <-- changé ici
  cards.forEach(card => {
    const userEl = card.querySelector('div.py-1.text-slate-600');
    if (userEl) {
      const cardUser = userEl.textContent.trim();
      if (!userName || cardUser === userName) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    }
  });
}

  function createUserSelector(users) {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = '9999';
    container.style.background = '#fff';
    container.style.border = '1px solid #ccc';
    container.style.padding = '5px 10px';
    container.style.borderRadius = '5px';
    container.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    container.style.fontSize = '14px';

    const label = document.createElement('label');
    label.textContent = 'Filtrer : ';
    label.style.marginRight = '5px';

    const select = document.createElement('select');
    const defaultOption = document.createElement('option');
    defaultOption.textContent = '-- Tous les utilisateurs --';
    defaultOption.value = '';
    select.appendChild(defaultOption);

    users.forEach(({ name }) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const userName = e.target.value;
      filterCardsByUser(userName);
    });

    container.appendChild(label);
    container.appendChild(select);
    document.body.appendChild(container);
  }

  function initSelector() {
    const users = getUserElements();
    if (users.length > 0) {
      createUserSelector(users);
    }
  }

  const observer = new MutationObserver(() => {
    if (document.querySelector('div.py-1.text-slate-600')) {
      observer.disconnect();
      initSelector();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
