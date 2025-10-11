/*
 * Storage manager with JSON serialisation and size guarding.
 */
(function (window) {
    'use strict';

    var App = window.App = window.App || {};
    var Logger = App.Logger || console;

    function safeStringify(value) {
        try {
            return JSON.stringify(value);
        } catch (error) {
            Logger.warn('Storage stringify failed', error);
            return null;
        }
    }

    function StorageService() {}

    StorageService.get = function (key, fallback) {
        try {
            var raw = window.localStorage.getItem(key);
            if (raw === null || typeof raw === 'undefined') {
                return fallback;
            }
            return JSON.parse(raw);
        } catch (error) {
            Logger.warn('Storage get failed', { key: key, error: error.message });
            return fallback;
        }
    };

    StorageService.set = function (key, value) {
        try {
            var data = safeStringify(value);
            if (data === null) {
                return false;
            }
            window.localStorage.setItem(key, data);
            return true;
        } catch (error) {
            Logger.warn('Storage set failed', { key: key, error: error.message });
            return false;
        }
    };

    StorageService.remove = function (key) {
        try {
            window.localStorage.removeItem(key);
        } catch (error) {
            Logger.warn('Storage remove failed', { key: key, error: error.message });
        }
    };

    StorageService.clear = function () {
        try {
            window.localStorage.clear();
        } catch (error) {
            Logger.warn('Storage clear failed', error);
        }
    };

    App.StorageService = StorageService;
}(window));

