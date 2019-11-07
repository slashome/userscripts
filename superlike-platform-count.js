// ==UserScript==
// @name         Superlike platform count
// @namespace    https://supermood.co
// @updateURL    https://raw.githubusercontent.com/slashome/userscripts/master/superlike-platform-count.js
// @version      0.1
// @description  Count received / sent superlike by users
// @author       https://github.com/slashome
// @match        https://supermood.co/app/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

var spc =
{
	run: function()
	{
		if (!this.isPlatform()) { return }

		var _this = this;

		this.getUser(function(data)
		{
			var companyId = data.user.cid;

			var container = $('<div></div>');
			container.attr('style', 'padding:10px');
			container.hide();

			var open =  false;

			var button = $('<div>Click to show receive/sent count</div>');
			button.attr('style', 'display:inline-block;text-aligh:right;margin:10px;border:1px solid #3794ff;border-radius:6px;background:linear-gradient(to left,#2e9aff,#438bff);color:#fff;box-shadow:0 2px 4px 0 rgba(55,148,255,.11);cursor:pointer;padding:10px 11px;font-size:12px;line-height:12px;font-weight:400;text-align:center;');

			button.click(function() {
				open = !open;
				(open) ? container.show() : container.hide();
			});

			_this.getPraisable(companyId, function(praisables) {
				_this.getSent(companyId, function(data) {
					_this.setResult('Sent', praisables, data, container);

					_this.getReceived(companyId, function(data) {
						_this.setResult('Received', praisables, data, container);
							var clearfix = $('<div></div>');
							clearfix.attr('style', 'content:" ";visibility:hidden;display:block;height:0;clear:both;');
							container.append(clearfix);

							$('body').prepend(container);
							$('body').prepend(button);
					});
				});
			});
		});
	},

	fetch: function()
	{
		return window.fetch.bind(window);
	},


	isPlatform: function()
	{
		return window.location.href.indexOf("/platform/") > -1;
	},

	getToken: function()
	{
		return localStorage.getItem('token');
	},

	getUser: function(callback)
	{
		return this.fetchUrl('https://supermood.co/api/me', callback);
	},

	getReceived: function(companyId, callback)
	{
		return this.fetchUrl('https://supermood.co/api/company/' + companyId + '/praises/received', callback);
	},

	getSent: function(companyId, callback)
	{
		return this.fetchUrl('https://supermood.co/api/company/' + companyId + '/praises/sent', callback);
	},

	getPraisable: function (companyId, callback) {
		return this.fetchUrl('https://supermood.co/api/company/' + companyId + '/coworkers/praisable', callback);
	},

	setResult(title, praisables, data, container)
	{
		var countPerUser = this.getCountPerUser(title, praisables, data);
		console.log(countPerUser);

		var html  = $('<div></div>');
		html.attr('style', 'float:left;margin-right:10px');

		var title = $('<div>' + title + '<div>');
		title.attr('style', 'font-size:16px;font-weight:700;color:#3794ff;margin:16px;');

		var items = $('<div><div>');
		$.each(countPerUser, function(index, user) {
			var item = $('<div><span class="count">' + user.count + '</span> - ' + user.name + '<div>');
			var count = item.children('.count');
			count.attr('style', 'font-weight:700');
			items.append(item);
		});

		html.append(title);
		html.append(items);

		container.append(html);
	},

	getCountPerUser(type, praisables, data) {
		var countPerUser = [];
		$.each(praisables, function(index, item) {
			var un = item.fn + ' ' + item.ln;
			countPerUser.push({name: un, count: 0});
		});
		$.each(data, function(index, item) {
			var username = (type === 'Received') ? item.fromName : item.to.firstName + ' ' + item.to.lastName;
			existingItem = _.find(countPerUser, { name: username });
			if (existingItem === undefined) {
				countPerUser.push({name: username, count: 1});
			} else {
				existingItem.count++;
			}

		});
		return _.map(_.sortByOrder(countPerUser, ['count'], ['desc']));
	},

	fetchUrl: function(calledUrl, callback)
	{
		var _this = this;
		$.ajax({
		    url: calledUrl,
		    headers: {
	       		'Accept': "application/json, text/plain, */*",
	       		'Accept-Language': "en-US,en",
		        'Authorization':'Bearer ' + _this.getToken(),
		        'Content-Type':'application/json'
		    },
		    method: 'GET',
		    dataType: 'json',
		    success: function(data){
		    	callback(data);
		    }
		});
	},

	arrayFlip: function(trans)
	{
	    var key, tmp_ar = {};

	    for ( key in trans )
	    {
	        if ( trans.hasOwnProperty( key ) )
	        {
	            tmp_ar[trans[key]] = key;
	        }
	    }

	    return tmp_ar;
	}
}

spc.run();


