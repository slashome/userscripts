// ==UserScript==
// @name         CMC Auto-fill survey
// @description  Fill automatically the Happy form with random answers
// @version      1.0
// @namespace    https://choosemycompany.com
// @author       https://github.com/slashome
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/scripts/cmc-autofill-survey.js
// @downloadURL  https://raw.githubusercontent.com/slashome/userscripts/master/scripts/cmc-autofill-survey.js
// @match        surveys.choosemycompany.com/*
// @match        surveys.preprod.choosemycompany.com/*
// @match        surveys-vm.preprod.choosemycompany.com/*
// @grant        none
// ==/UserScript==

const NOTE_MIN = 3;
const NOTE_MAX = 5;

(function () {
    'use strict';

   function answerStars() {
    const selects = document.querySelectorAll('select.happyform-input.stars-question-blue');
    selects.forEach(select => {
        const validOptions = Array.from(select.options).filter(option => {
            const value = parseFloat(option.value);
            return value >= NOTE_MIN && value <= NOTE_MAX;
        });
        selectionRandomOptions(select, validOptions)
    });
}
    function answerSelectors() {
        const selects = document.querySelectorAll('select.happyform-input:not(.stars-question-blue)');
        selects.forEach(select => {
            selectionRandomOptions(select, select.options)
        });
    }
    function selectionRandomOptions(select, options) {
        const randomIndex = Math.floor(Math.random() * (options.length - 1)) + 1;
        const chosenOption = options[randomIndex];
        select.value = chosenOption.value;
        select.dispatchEvent(new Event('change'));
    }
    function answerTexts() {
        const randomStrings = [
            "This is a sample response.",
            "I totally agree with this statement.",
            "No comment.",
            "This is my honest feedback.",
            "Could be better, but it's okay.",
            "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
        ];
        const textareas = document.querySelectorAll('textarea.happyform-input');
        textareas.forEach(textarea => {
            const randomText = randomStrings[Math.floor(Math.random() * randomStrings.length)];
            textarea.value = randomText;
            textarea.dispatchEvent(new Event('input'));
        });
    }

    function answer() {
        answerStars();
        answerTexts();
        answerSelectors();
    }

    function createButton() {
        const button = document.createElement('button');
        button.textContent = 'Remplir le formulaire';
        button.style.cssText = 'margin-bottom: 0px; display: inline-block; float: left; top: 14px; position: absolute; left: 10px;';
        const oldHappy = document.querySelector('.happyform-header');
        const newHappy = document.querySelector('.happyform__nav');
        const header = oldHappy ?? newHappy;
        header.appendChild(button);
        button.addEventListener('click', function() {
            answer();
        });
    }

    createButton();
})();