// 'use strict';
//
chrome.runtime.onInstalled.addListener( (details) => {
  console.log('previousVersion', details.previousVersion);
});
// chrome.browserAction.setBadgeText({text: '\'Allo'});

// Code from other project
var interval = null;
var updateTime = 5000;
var currentTabInfo = {};
var userActive = true;
var settings = {};

var getURL = function(url) {
    chrome.storage.local.get('trackr', function(data) {
        var index, found;
        var hostname = new URL(url).hostname;

        if ($.isEmptyObject(data)) {
            currentTabInfo.id = '_' + Math.random().toString(36).substr(2, 9);
            currentTabInfo.title = hostname;
            currentTabInfo.time = 0;
            var obj = {
                'trackr': [{
                    'id': currentTabInfo.id,
                    'title': currentTabInfo.title,
                    'time': currentTabInfo.time
                }]
            };
            chrome.storage.local.set(obj);
            return;
        }

        $.each(data.trackr, function(i, v) {
            if (v.title === hostname) {
                index = i;
                found = true;
                return false;
            }
        });

        if (found) {
            var retrieved = data.trackr[index];
            currentTabInfo.id = retrieved.id;
            currentTabInfo.title = retrieved.title;
            currentTabInfo.time = retrieved.time;
        } else {
            currentTabInfo.id = '_' + Math.random().toString(36).substr(2, 9);
            currentTabInfo.title = hostname;
            currentTabInfo.time = 0;

            data.trackr.push({
                'id': currentTabInfo.id,
                'title': currentTabInfo.title,
                'time': currentTabInfo.time
            });
        }

        chrome.storage.local.set(data);
    });
};

var updateURL = function() {
    if (userActive) {
        console.log('User is active on ' + currentTabInfo.title);
        chrome.storage.local.get('trackr', function(data) {
            var index;
            $.each(data.trackr, function(i, v) {
                if (v.title === currentTabInfo.title) {
                    index = i;
                    return false;
                }
            });
            data.trackr[index].time = data.trackr[index].time + 1;

            chrome.storage.local.set(data);
        });
    } else {
        console.log('User is not active on ' + currentTabInfo.title);
    }
};

var getSettings = function() {
    chrome.storage.sync.get('trackr_settings', function(data) {
        if (data.trackr_settings) {
            settings = data.trackr_settings;
            window.produtivo = data.trackr_settings;
        }
    });
};

var getCurrentTab = function() {
    chrome.tabs.query({
        currentWindow: true,
        active: true
    }, function(tabs) {
         var tab = tabs[0];
         console.log('tabs', tabs);
        var hostname = new URL(tab.url).hostname;
        var found = false;

        for (var i = 0; i < settings.blacklist.length; i++) {
            if (settings.blacklist[i] === hostname) {
                found = true;
            }
        }
        if (!found) {
            console.log('URL not found on blacklist');
            currentTabInfo.blacklist = false;
            getURL(tabs[0].url);
            clearInterval(interval);
            interval = null;
            interval = setInterval(function() {
                updateURL();
            }, updateTime);
        } else {
            console.log('URL found on blacklist');
            currentTabInfo.blacklist = true;
            clearInterval(interval);
            interval = null;
        }
    });
};

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (sender.tab) {
        console.log('userActive\'s value is ' + message.userActive);
        userActive = message.userActive;
    } else {
        if (message.settingsChanged) {
            console.log('Settings changed!');
            getSettings();
        }
    }
});

chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        chrome.storage.sync.get({
            "trackr_settings": {
                "blacklist": ['newtab', 'devtools', 'extensions'],
                "time_units": "minutes"
            }
        }, function(data) {
            chrome.storage.sync.set(data);
            settings = data.trackr_settings;
        });
    }
});

getSettings();
getCurrentTab();

chrome.tabs.onUpdated.addListener(getCurrentTab);
chrome.tabs.onActivated.addListener(getCurrentTab);



/* For the Site blocking */

var arrBlockedURLS;

var blockURLS = function(details)
{

  chrome.storage.sync.get(
    {
      blockedSites: 'facebook.com\nfacebook.net\nplus.google.com\ntwitter.com'
    }
    , function(items)
    {
      arrBlockedURLS = items.blockedSites.split('\n');
    });

  var url = details.url.toUpperCase();

  for (var i in arrBlockedURLS)
  {
    if(url.indexOf(arrBlockedURLS[i].toUpperCase()) != -1)
    {
      console.log('Site Blocker blocked: ' + url + ' matched ' + arrBlockedURLS[i].toUpperCase());
      // chrome.tabs.update({url: chrome.extension.getURL(`warning.html?site=${arrBlockedURLS[i]}`)});
      // window.location = chrome.extension.getURL("warning.html");
      return {cancel: true};
    }
  }

  return {cancel: false};

}

chrome.webRequest.onBeforeRequest.addListener(
  blockURLS,
  // filters
  {
    urls: [
      "<all_urls>"
    ]
  },
  // extraInfoSpec
  ["blocking"]);

