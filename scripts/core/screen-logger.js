/*
 * On-screen debug logger for webOS TVs.
 */
(function (window, document) {
    'use strict';

    var App = window.App = window.App || {};

    function createContainer() {
        var container = document.createElement('div');
        container.id = 'debugOverlay';
        container.style.position = 'fixed';
        container.style.top = '24px';
        container.style.right = '24px';
        container.style.width = '420px';
        container.style.maxHeight = '460px';
        container.style.background = 'rgba(0, 0, 0, 0.82)';
        container.style.border = '2px solid rgba(74, 158, 255, 0.6)';
        container.style.borderRadius = '16px';
        container.style.padding = '16px';
        container.style.fontFamily = 'monospace';
        container.style.fontSize = '16px';
        container.style.lineHeight = '1.4';
        container.style.color = '#7CFFE7';
        container.style.zIndex = '99999';
        container.style.overflowY = 'auto';
        container.style.display = 'none';
        container.setAttribute('role', 'log');
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-label', 'Debug log output');
        return container;
    }

    function ScreenLogger() {
        this.container = createContainer();
        document.body.appendChild(this.container);
        this.maxEntries = 60;
    }

    ScreenLogger.prototype.write = function (message, meta) {
        var entry = document.createElement('div');
        entry.textContent = message;

        if (meta !== undefined) {
            try {
                entry.textContent += ' ' + JSON.stringify(meta);
            } catch (error) {
                entry.textContent += ' [meta]';
            }
        }

        this.container.appendChild(entry);

        while (this.container.children.length > this.maxEntries) {
            this.container.removeChild(this.container.firstChild);
        }

        this.container.scrollTop = this.container.scrollHeight;
    };

    ScreenLogger.prototype.show = function () {
        this.container.style.display = 'block';
    };

    ScreenLogger.prototype.hide = function () {
        this.container.style.display = 'none';
    };

    ScreenLogger.prototype.toggle = function () {
        if (this.container.style.display === 'none') {
            this.show();
        } else {
            this.hide();
        }
    };

    ScreenLogger.prototype.clear = function () {
        this.container.innerHTML = '';
    };

    App.ScreenLogger = ScreenLogger;
}(window, document));

