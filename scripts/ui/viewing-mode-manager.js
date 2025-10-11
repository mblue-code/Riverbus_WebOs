(function (window, document) {
    'use strict';

    var App = window.App = window.App || {};
    var Logger = App.Logger || console;

    var STORAGE_KEY = 'fp_viewing_mode';
    var DEFAULT_MODE = 'theater';
    var MODES = ['theater', 'chat', 'fullscreen'];
    var MODE_LABELS = {
        theater: 'Theater Mode',
        chat: 'Chat Mode',
        fullscreen: 'Fullscreen'
    };

    function ViewingModeManager(options) {
        options = options || {};
        this.container = options.container || document.getElementById('playerContainer');
        this.sidebar = options.sidebar || document.getElementById('playerSidebar');
        this.chatPanel = options.chatPanel || document.getElementById('chatPanel');
        this.modeIndicator = options.modeIndicator || document.getElementById('viewingModeIndicator');
        this.videoElement = options.videoElement || document.getElementById('videoElement');
        this.statusEmitter = options.statusEmitter;
        this.currentMode = DEFAULT_MODE;
        this.previousMode = null;
        this.listeners = {
            change: []
        };
        this._bindFullscreenHandler();
        this.restore();
        this.apply(this.currentMode, true);
    }

    ViewingModeManager.prototype._bindFullscreenHandler = function () {
        var self = this;
        if (typeof document === 'undefined') {
            return;
        }
        document.addEventListener('fullscreenchange', function () {
            if (!document.fullscreenElement && self.currentMode === 'fullscreen') {
                self.apply(self.previousMode || DEFAULT_MODE);
            }
        });
    };

    ViewingModeManager.prototype.on = function (eventName, handler) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(handler);
    };

    ViewingModeManager.prototype._emit = function (eventName, payload) {
        var handlers = this.listeners[eventName] || [];
        for (var i = 0; i < handlers.length; i += 1) {
            try {
                handlers[i](payload);
            } catch (error) {
                Logger.warn('ViewingModeManager listener error', eventName, error);
            }
        }
    };

    ViewingModeManager.prototype.restore = function () {
        try {
            var stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored && MODES.indexOf(stored) !== -1) {
                this.currentMode = stored;
            }
        } catch (error) {
            Logger.warn('ViewingModeManager restore failed', error);
        }
    };

    ViewingModeManager.prototype.save = function () {
        try {
            window.localStorage.setItem(STORAGE_KEY, this.currentMode);
        } catch (error) {
            Logger.warn('ViewingModeManager save failed', error);
        }
    };

    ViewingModeManager.prototype.apply = function (mode, silent) {
        if (!mode || MODES.indexOf(mode) === -1) {
            mode = DEFAULT_MODE;
        }

        if (!this.container) {
            return;
        }

        if (this.currentMode !== mode) {
            this.previousMode = this.currentMode;
            this.currentMode = mode;
            this.save();
        }

        this.container.classList.remove('mode-theater', 'mode-chat', 'mode-fullscreen');
        this.container.classList.add('mode-' + mode);

        if (this.sidebar) {
            if (mode === 'chat') {
                this.sidebar.classList.add('show-chat');
            } else {
                this.sidebar.classList.remove('show-chat');
            }
        }

        if (this.chatPanel) {
            if (mode === 'chat') {
                this.chatPanel.setAttribute('data-visible', 'true');
            } else {
                this.chatPanel.setAttribute('data-visible', 'false');
            }
        }

        if (mode === 'fullscreen') {
            this._enterFullscreen();
        } else {
            this._exitFullscreen();
        }

        this._updateIndicator(mode, silent);
        this._emit('change', { mode: mode });
    };

    ViewingModeManager.prototype._enterFullscreen = function () {
        if (!this.container) {
            return;
        }

        if (document.fullscreenElement === this.container) {
            return;
        }

        if (this.container.requestFullscreen) {
            this.container.requestFullscreen();
        } else if (this.container.webkitRequestFullscreen) {
            this.container.webkitRequestFullscreen();
        }
    };

    ViewingModeManager.prototype._exitFullscreen = function () {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    };

    ViewingModeManager.prototype.toggle = function () {
        var currentIndex = MODES.indexOf(this.currentMode);
        if (currentIndex === -1) {
            currentIndex = 0;
        }
        var next = MODES[(currentIndex + 1) % MODES.length];
        this.apply(next);
    };

    ViewingModeManager.prototype.set = function (mode) {
        this.apply(mode);
    };

    ViewingModeManager.prototype._updateIndicator = function (mode, silent) {
        if (!this.modeIndicator) {
            return;
        }

        var label = MODE_LABELS[mode] || mode;
        this.modeIndicator.textContent = label;

        if (silent) {
            return;
        }

        this.modeIndicator.classList.add('is-visible');
        if (this._indicatorTimer) {
            window.clearTimeout(this._indicatorTimer);
        }
        var self = this;
        this._indicatorTimer = window.setTimeout(function () {
            self.modeIndicator.classList.remove('is-visible');
        }, 2000);
    };

    App.ViewingModeManager = ViewingModeManager;
}(window, document));


