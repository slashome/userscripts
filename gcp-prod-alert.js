// ==UserScript==
// @description Alert if google cloud is set on Prod
// @name ProdAlert
// @include https://console.cloud.google.com/*
// @include https://console.cloud.google.com/*
// @version 0.1.0
// @run-at document-start
// @grant none
// ==/UserScript==

// Copyright 2017 Hyleus
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

var alertIsOn = false;

function addAlert() {
	// create alert div
	var alert = document.createElement('div');
	alert.innerText   = '/!\\ ALERT: THIS IS PRODUCTION /!\\';
	alert.setAttribute('id', 'custom-prod-alert');
	alert.style.cssText = 'position:absolute;top:0;left:0;right:0;z-index:666;background:red;padding:22px;font-size:38px;font-weight:bold;color:white;text-align:center;';
	// add body margin-top
	document.body.style.cssText = 'padding-top:60px;';
	document.body.appendChild(alert);
	alertIsOn = true;
}

function removeAlert() {
	var alert = document.getElementById( 'custom-prod-alert' );
	alert.parentNode.removeChild( alert );
	document.body.style.cssText = 'padding-top:0;';
	alertIsOn = false;
}

setInterval(function () {
	var switcherDiv = document.getElementsByClassName("cfc-switcher-button-label");
	if (switcherDiv[0].innerText === 'Supermood ' && !alertIsOn) {
		addAlert();
	} else if (switcherDiv[0].innerText !== 'Supermood ' && alertIsOn) {
		removeAlert();
	}
}, 1000);