// ==UserScript==
// @name         Trello Cost Counter
// @namespace    https://trello.com/
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/trello-cost-counter.js
// @version      0.2
// @description  Count the cost total per Trello list and displays it in Trello list header
// @author       https://github.com/slashome
// @match        https://trello.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
		var tcc = {
			init: function() {
				var lists = document.getElementsByClassName('js-list');
				for(var i = 0; i < lists.length; i++)
				{
				    var list = lists.item(i);
                    var existingTotalCost = list.getAttribute('tcc-total');
				    var totalCost = 0;
				    var badges = list.getElementsByClassName('badge-text');
					for(var j = 0; j < badges.length; j++)
					{
				    	var badgeContent = badges.item(j).innerHTML;
				    	if (badgeContent.substring(0, 12) == 'Total Cost: ') {
					    	var cost = Number(badgeContent.substring(12).replace(',', '.'));
					    	totalCost += cost;
						}
					}
                    if (existingTotalCost != totalCost) {
                        if (list.getElementsByClassName('trello-cost-counter').length > 0){
                            var tccItem = list.getElementsByClassName('trello-cost-counter').item(0);
                            tccItem.remove();
                        }
                        list.setAttribute('tcc-total', totalCost);
                        var headerName = list.getElementsByClassName('list-header-name')[0];
                        headerName.insertAdjacentHTML('afterEnd', '<div class="trello-cost-counter" style="margin-left:8px;font-size:12px;color:#6b808c;">Total cost<span style="display:inline-block;background-color:white;padding:6px 3px 6px;border-radius:50%;color:#17394d;margin-left:5px;width:25px;height:20px;text-align:-webkit-center;">'+totalCost+'</span></div>');
                    }
				}
			},
			removeByClass: function(className) {
		        var elements = document.getElementsByClassName(className);
			    while(elements.length > 0) {
			        elements[0].parentNode.removeChild(elements[0]);
			    }
			}
		};

		setInterval(function() {
			tcc.init();
		}, 1000);
})();
