/*
 * Logger utility with leveled logging and optional on-screen debug integration.
 */
(function (window) {
    'use strict';

    var App = window.App = window.App || {};

    var LEVELS = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3
    };

    var currentLevel = 'debug';
    var screenLogger = null;

    function formatMessage(level, message) {
        var timestamp = new Date().toISOString();
        return '[' + timestamp + '] [' + level.toUpperCase() + '] ' + message;
    }

    function shouldLog(level) {
        return LEVELS[level] >= LEVELS[currentLevel];
    }

    function logToConsole(level, message, meta) {
        if (!shouldLog(level)) {
            return;
        }

        var payload = formatMessage(level, message);

        if (meta !== undefined) {
            console[level](payload, meta);
        } else {
            console[level](payload);
        }
    }

    function logToScreen(level, message, meta) {
        if (!screenLogger || !shouldLog(level)) {
            return;
        }

        var payload = formatMessage(level, message);
        screenLogger.write(payload, meta);
    }

    App.Logger = {
        setLevel: function (level) {
            if (LEVELS[level] !== undefined) {
                currentLevel = level;
            }
        },
        attachScreenLogger: function (logger) {
            screenLogger = logger;
        },
        debug: function (message, meta) {
            logToConsole('debug', message, meta);
            logToScreen('debug', message, meta);
        },
        info: function (message, meta) {
            logToConsole('info', message, meta);
            logToScreen('info', message, meta);
        },
        warn: function (message, meta) {
            logToConsole('warn', message, meta);
            logToScreen('warn', message, meta);
        },
        error: function (message, meta) {
            logToConsole('error', message, meta);
            logToScreen('error', message, meta);
        }
    };
}(window));

