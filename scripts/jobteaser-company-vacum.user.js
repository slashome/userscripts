// ==UserScript==
// @name         JobTeaser Company Sucker
// @description  Get all companies for JobTeaser
// @version      1.0.0
// @namespace    https://www.jobteaser.com
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/scripts/jobteaser-company-vacum.user.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/master/scripts/jobteaser-company-vacum.user.js
// @match        jobteaser.com/fr/companies*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=jobteaser.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Set pour stocker les noms d'entreprises uniques
    let companies = new Set();
    let isCollecting = false;
    let collectButton;

    // Fonction pour attendre qu'un élément soit présent
    function waitForElement(selector, timeout = 20000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                } else {
                    setTimeout(check, 100);
                }
            }

            check();
        });
    }

    // Fonction pour collecter les noms d'entreprises de la page actuelle
    function collectCompaniesFromPage() {
        const companyElements = document.querySelectorAll('a[class*="CompanyCard_link__');
        let newCompanies = 0;

        companyElements.forEach(element => {
            const companyName = element.textContent.trim();
            if (companyName && !companies.has(companyName)) {
                companies.add(companyName);
                newCompanies++;
            }
        });

        console.log(`Page actuelle: ${newCompanies} nouvelles entreprises trouvées. Total: ${companies.size}`);
        updateButtonText();
        return newCompanies;
    }

    // Fonction pour mettre à jour le texte du bouton
    function updateButtonText() {
        if (collectButton) {
            if (isCollecting) {
                collectButton.textContent = `Collecte... (${companies.size} entreprises)`;
            } else {
                collectButton.textContent = `Collecter Entreprises (${companies.size})`;
            }
        }
    }

    // Fonction pour trouver et cliquer sur le bouton de pagination suivant
    async function goToNextPage() {
        try {
            // Attendre que les boutons de pagination soient chargés
            await waitForElement('a[class*="Pagination_item"]', 5000);

            // Trouver tous les boutons de pagination
            const paginationButtons = document.querySelectorAll('a[class*="Pagination_item"]');

            // Trouver le bouton "suivant" (généralement le dernier bouton avec une flèche ou "Suivant")
            let nextButton = null;

            for (let button of paginationButtons) {
                const buttonText = button.textContent.trim().toLowerCase();
                const buttonHTML = button.innerHTML.toLowerCase();

                // Chercher le bouton suivant par texte ou par position
                if (buttonText.includes('suivant') ||
                    buttonText.includes('next') ||
                    buttonHTML.includes('→') ||
                    buttonHTML.includes('chevron-right') ||
                    button.getAttribute('aria-label')?.toLowerCase().includes('suivant')) {
                    nextButton = button;
                    break;
                }
            }

            // Si pas trouvé par texte, prendre le dernier bouton qui n'est pas désactivé
            if (!nextButton && paginationButtons.length > 0) {
                const lastButton = paginationButtons[paginationButtons.length - 1];
                if (!lastButton.classList.contains('disabled') &&
                    !lastButton.hasAttribute('disabled')) {
                    nextButton = lastButton;
                }
            }

            if (nextButton && !nextButton.classList.contains('disabled') && !nextButton.hasAttribute('disabled')) {
                console.log('Clic sur le bouton suivant...');
                nextButton.click();
                return true;
            } else {
                console.log('Pas de bouton suivant disponible - fin de la collecte');
                return false;
            }
        } catch (error) {
            console.error('Erreur lors de la recherche du bouton suivant:', error);
            return false;
        }
    }

    // Fonction principale de collecte
    async function startCollection() {
        if (isCollecting) {
            // Arrêter la collecte
            isCollecting = false;
            updateButtonText();
            displayResults();
            return;
        }

        isCollecting = true;
        companies.clear();
        updateButtonText();

        console.log('Début de la collecte des entreprises...');

        try {
            while (isCollecting) {
                // Attendre que les cartes d'offres soient chargées
                await waitForElement('a[class*="CompanyCard_link__', 5000);

                // Collecter les entreprises de la page actuelle
                collectCompaniesFromPage();

                // Attendre un peu avant de passer à la page suivante
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Aller à la page suivante
                const hasNextPage = await goToNextPage();

                if (!hasNextPage) {
                    break;
                }

                // Attendre que la nouvelle page se charge
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error('Erreur during collection:', error);
        }

        isCollecting = false;
        updateButtonText();
        displayResults();
    }

    // Fonction pour afficher les résultats
    function displayResults() {
        const companiesList = Array.from(companies).sort();
        console.log(`Collecte terminée! ${companiesList.length} entreprises uniques trouvées:`);
        console.log(companiesList);

        // Créer un blob pour télécharger la liste
        const csvContent = companiesList.map(company => `"${company}"`).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `entreprises_jobteaser_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Afficher aussi dans une popup
        alert(`Collecte terminée!\n${companiesList.length} entreprises uniques trouvées.\nLe fichier CSV a été téléchargé.`);
    }

    function addCollectButton() {
        try {
            let entreprisesLink = document.querySelector('a[href="/fr/companies"]');

            if (!entreprisesLink) {
                console.log('Lien avec href="/fr/companies" non trouvé, tentative via texte...');
                const navLinks = document.querySelectorAll('li a');

                for (let link of navLinks) {
                    if (link.textContent.trim() === 'Entreprises') {
                        entreprisesLink = link;
                        break;
                    }
                }
            }

            if (!entreprisesLink) {
                console.log('Impossible de trouver le lien "Entreprises"');
                return;
            }

            createButton(entreprisesLink.parentElement);

        } catch (error) {
            console.error('Erreur lors de l\'ajout du bouton:', error);
        }
    }

    function createButton(targetElement) {
        const newLi = document.createElement('li');
        newLi.style.display = 'inherit';
        newLi.style.alignItems = 'center';

        collectButton = document.createElement('a');
        collectButton.style.cursor = 'pointer';
        collectButton.style.backgroundColor = '#007bff';
        collectButton.style.display = 'inherit';
        collectButton.style.alignItems = 'center';
        collectButton.style.color = 'white';
        collectButton.style.borderRadius = '4px';
        collectButton.style.height = '4rem';
        collectButton.style.padding = '0.75rem';
        collectButton.textContent = 'Collecter Entreprises (0)';

        // Ajouter l'événement click
        collectButton.addEventListener('click', startCollection);

        // Ajouter le bouton au li
        newLi.appendChild(collectButton);

        // Insérer après l'élément "Entreprises"
        targetElement.parentNode.insertBefore(newLi, targetElement.nextSibling);

        console.log('Bouton de collecte ajouté avec succès');
    }

    // Attendre que la page soit chargée puis ajouter le bouton
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addCollectButton);
        } else {
            // La page est déjà chargée
            setTimeout(addCollectButton, 1000);
        }
    }

    // Initialiser le script
    init();

})();
