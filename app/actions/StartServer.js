/* eslint-disable no-console */
import { ipcRenderer } from 'electron';
import { push } from 'react-router-redux';
import { serverLogsReceived, clearLogs, setServerArgs } from './ServerMonitor';
import settings from 'electron-settings';

export const SERVER_START_REQ = 'SERVER_START_REQ';
export const SERVER_START_OK = 'SERVER_START_OK';
export const SERVER_START_ERR = 'SERVER_START_ERR';
export const UPDATE_ARGS = 'UPDATE_ARGS';
export const SWITCH_TAB = 'SWITCH_TAB';
export const PRESET_SAVE_REQ = 'PRESET_SAVE_REQ';
export const PRESET_SAVE_OK = 'PRESET_SAVE_OK';
export const GET_PRESETS = 'GET_PRESETS';
export const PRESET_DELETE_REQ = 'PRESET_DELETE_REQ';
export const PRESET_DELETE_OK = 'PRESET_DELETE_OK';

export function startServer (evt) {
  evt.preventDefault();
  return (dispatch, getState) => {
    // signal to the UI that we are beginning our request
    dispatch({type: SERVER_START_REQ});
    const {serverArgs} = getState().startServer;

    // if we get an error from electron, fail with the message
    ipcRenderer.once('appium-start-error', (event, message) => {
      // don't listen for log lines any more if we failed to start, other-
      // wise we'll start to stack listeners for subsequent attempts
      ipcRenderer.removeAllListeners('appium-log-line');
      alert(`Error starting Appium server: ${message}`);
      dispatch({type: SERVER_START_ERR});
    });

    ipcRenderer.once('appium-start-ok', async () => {
      // don't listen for subsequent server start failures later in the
      // lifetime of this app instance
      ipcRenderer.removeAllListeners('appium-start-error');
      dispatch({type: SERVER_START_OK});
      dispatch(setServerArgs(serverArgs));
      dispatch(push('/monitor'));
      await settings.set('SERVER_PORT', serverArgs.port);
      await settings.set('SERVER_HOST', serverArgs.address);
    });

    ipcRenderer.on('appium-log-line', (event, logs) => {
      dispatch(serverLogsReceived(logs));
    });

    dispatch(clearLogs());
    ipcRenderer.send('start-server', serverArgs);
  };
}

export function updateArgs (args) {
  return (dispatch) => {
    dispatch({type: UPDATE_ARGS, args});
  };
}

export function switchTab (tabId) {
  return (dispatch) => {
    dispatch({type: SWITCH_TAB, tabId});
  };
}

export function savePreset (name, args) {
  return async (dispatch) => {
    dispatch({type: PRESET_SAVE_REQ});
    let presets = await settings.get('presets');
    try {
      presets[name] = args;
      presets[name]._modified = Date.now();
      await settings.set('presets', presets);
    } catch (e) {
      console.error(e);
      alert(`There was a problem saving preset: ${e.message}`);
    }
    dispatch({type: PRESET_SAVE_OK, presets});
  };
}

export function getPresets () {
  return async (dispatch) => {
    try {
      let presets = await settings.get('presets');
      dispatch({type: GET_PRESETS, presets});
    } catch (e) {
      console.error(e);
      alert(`Error getting presets: ${e.message}`);
    }
  };
}

export function deletePreset (name) {
  return async (dispatch) => {
    dispatch({type: PRESET_DELETE_REQ});
    let presets = await settings.get('presets');
    try {
      delete presets[name];
      await settings.set('presets', presets);
    } catch (e) {
      console.error(e);
      alert(`There was a problem deleting preset: ${e.message}`);
    }
    dispatch({type: PRESET_DELETE_OK, presets});
  };
}
