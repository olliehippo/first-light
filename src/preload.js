'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call = (ch, arg) => ipcRenderer.invoke(ch, arg);

contextBridge.exposeInMainWorld('mm', {
  platform: process.platform,
  getState: () => call('state:get'),
  onState: cb => ipcRenderer.on('state', (_e, s) => cb(s)),
  onToggleSidebar: cb => ipcRenderer.on('toggle-sidebar', () => cb()),
  continueWithGoogle: () => call('auth:google'),
  signInWithEmail: data => call('auth:email', data),
  signOut: () => call('auth:signOut'),
  reset: () => call('auth:reset'),
  setKey: key => call('key:set', key),
  addGoogle: () => call('accounts:addGoogle'),
  reconnect: id => call('accounts:reconnect', id),
  addImap: data => call('accounts:addImap', data),
  addIcal: data => call('accounts:addIcal', data),
  removeAccount: id => call('accounts:remove', id),
  updateAccount: (id, patch) => call('accounts:update', { id, patch }),
  refreshAccounts: () => call('accounts:refresh'),
  setPriority: data => call('mail:setPriority', data),
  refreshBrief: () => call('brief:refresh'),
  setPrefs: patch => call('prefs:set', patch),
  customise: wishes => call('prefs:customise', wishes),
  addTodo: data => call('todos:add', data),
  updateTodo: (id, patch) => call('todos:update', { id, patch }),
  removeTodo: id => call('todos:remove', id),
  clearDoneTodos: () => call('todos:clearDone'),
  setWeather: name => call('weather:set', name),
  setSettings: patch => call('settings:set', patch),
  openExternal: url => call('open:external', url)
});
