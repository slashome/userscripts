// ==UserScript==
// @name         Trello cost counter
// @namespace    https://trello.com/
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/trello-cost-counter.js
// @version      0.1
// @description  Count the cost total per Trello list and displays it in Trello list header
// @author       https://github.com/slashome
// @match        https://trello.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
		var trelloCostCounter = {
			init: function() {
				this.removeByClass('trello-cost-counter');
				var lists = document.getElementsByClassName('js-list');
				for(var i = 0; i < lists.length; i++)
				{
				    var list = lists.item(i);
				    var totalCost = 0;
				    var badges = list.getElementsByClassName('badge-text');
					for(var j = 0; j < badges.length; j++)
					{
				    	var badgeContent = badges.item(j).innerHTML;
				    	if (badgeContent.substring(0, 12) == 'Total Cost: ') {
					    	var cost = Number(badgeContent.substring(12));
					    	totalCost += cost;
						}
					}
					var headerName = list.getElementsByClassName('list-header-name')[0];
					headerName.insertAdjacentHTML('afterEnd', '<div class="trello-cost-counter">Total cost: '+totalCost+'</div>');
				}
			},
			removeByClass: function(className) {
		        var elements = document.getElementsByClassName(className);
			    while(elements.length > 0) {
			        elements[0].parentNode.removeChild(elements[0]);
			    }
			}
		};
		trelloCostCounter.init();

		setInterval(function() {
			trelloCostCounter.init();
		}, 1000);
})();
