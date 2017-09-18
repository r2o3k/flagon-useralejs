/*
 eslint-disable
 */

import * as globals from './globals';
import * as MessageTypes from './messageTypes.js';
import { timeStampScale } from '../getInitialSettings.js';
import { initPackager, packageLog } from '../packageLogs.js';
import { initSender } from '../sendLogs.js';

// inherent dependency on globals.js, loaded by the webext

// browser is defined in firefox, but not in chrome. In chrome, they use
// the 'chrome' global instead. Let's map it to browser so we don't have
// to have if-conditions all over the place.

var browser = browser || chrome;
var logs = [];
var config = {
  autostart: true,
  url: 'http://localhost:8000',
  transmitInterval: 5000,
  logCountThreshold: 5,
  userId: null,
  version: null,
  resolution: 500,
  time: timeStampScale({}),
  on: true,
};
var sessionId = 'session_' + Date.now();
browser.storage.local.set({ sessionId: sessionId });

let store = browser.storage.local.get({
  userAleHost: globals.userAleHost,
  userAleScript: globals.userAleScript,
  toolUser: globals.toolUser,
  toolName: globals.toolName,
  toolVersion: globals.toolVersion,
}, storeCallback);
        
function storeCallback(item) {
  config = Object.assign({}, config, {
    url: item.userAleHost,
    userId: item.toolUser,
    sessionID: sessionId,
    toolName: item.toolName,
    toolVersion: item.toolVersion
  });

  initPackager(logs, config);
  initSender(logs, config);
}

function dispatchTabMessage(message) {
  browser.tabs.query({}, function (tabs) {
    tabs.forEach(function (tab) {
      browser.tabs.sendMessage(tab.id, message);
    });
  });
}

function packageBrowserLog(type, logDetail) {
  logs.push({
    'target' : null,
    'path' : null,
    'clientTime' : Date.now(),
    'location' : null,
    'type' : 'browser.' + type,
    'logType': 'raw',
    'userAction' : true,
    'details' : logDetail,
    'userId' : globals.userId,
    'toolVersion': null,
    'toolName': null,
    'useraleVersion': null,
    'sessionID': sessionId,
  });
}

browser.runtime.onMessage.addListener(function (message) {
  switch (message.type) {
    case MessageTypes.CONFIG_CHANGE:
      const updatedConfig = Object.assign({}, config, {
        url: message.payload.userAleHost,
        userId: message.payload.toolUser,
        toolName: message.payload.toolName,
        toolVersion: message.payload.toolVersion
      });
      initPackager(logs, updatedConfig);
      initSender(logs, updatedConfig);
      dispatchTabMessage(message);
      break;
    default:
      console.log('got unknown message type ', message);
  }
});

function getTabDetailById(tabId, onReady) {
  browser.tabs.get(tabId, function (tab) {
    onReady({
      active: tab.active,
      audible: tab.audible,
      incognito: tab.incognito,
      index: tab.index,
      muted: tab.mutedInfo ? tab.mutedInfo.muted : null,
      pinned: tab.pinned,
      selected: tab.selected,
      tabId: tab.id,
      title: tab.title,
      url: tab.url,
      windowId: tab.windowId,
    });
  });
}

browser.tabs.onActivated.addListener(function (e) {
  getTabDetailById(e.tabId, function (detail) {
    packageBrowserLog('tabs.onActivated', detail);
  });
});

browser.tabs.onCreated.addListener(function (tab, e) {
  packageBrowserLog('tabs.onCreated', {
    active: tab.active,
    audible: tab.audible,
    incognito: tab.incognito,
    index: tab.index,
    muted: tab.mutedInfo ? tab.mutedInfo.muted : null,
    pinned: tab.pinned,
    selected: tab.selected,
    tabId: tab.id,
    title: tab.title,
    url: tab.url,
    windowId: tab.windowId,
  });
});

browser.tabs.onDetached.addListener(function (tabId) {
  getTabDetailById(tabId, function (detail) {
    packageBrowserLog('tabs.onDetached', detail);
  });
});

browser.tabs.onMoved.addListener(function (tabId) {
  getTabDetailById(tabId, function (detail) {
    packageBrowserLog('tabs.onMoved', detail);
  });
});

browser.tabs.onRemoved.addListener(function (tabId) {
  packageBrowserLog('tabs.onRemoved', { tabId: tabId });
});

browser.tabs.onZoomChange.addListener(function (e) {
  getTabDetailById(e.tabId, function (detail) {
    packageBrowserLog('tabs.onZoomChange', Object.assign({}, {
      oldZoomFactor: e.oldZoomFactor,
      newZoomFactor: e.newZoomFactor,
    }, detail));
  });
});

/*
 eslint-enable
 */