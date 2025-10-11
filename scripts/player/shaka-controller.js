/*
 * Shaka-based video player controller with livestream support (DVR, jump-to-live).
 */
(function (window, document) {
    'use strict';

    var App = window.App = window.App || {};
    var Logger = App.Logger;

    var DEFAULT_BUFFER_CONFIG = {
        bufferingGoal: 25,
        rebufferingGoal: 4,
        bufferBehind: 30
    };

    function toSeconds(value) {
        return Math.max(0, Math.floor(value || 0));
    }

    function ShakaController(videoElement) {
        if (!videoElement) {
            throw new Error('Video element required');
        }

        this.video = videoElement;
        this.player = null;
        this.isLive = false;
        this.dvrWindow = null;
        this._init();
    }

    ShakaController.prototype._init = function () {
        if (!window.shaka || !window.shaka.Player) {
            Logger.error('Shaka Player not available');
            return;
        }

        shaka.polyfill.installAll();

        if (!shaka.Player.isBrowserSupported()) {
            Logger.error('Shaka Player not supported on this device');
            return;
        }

        this.player = new shaka.Player(this.video);
        this._applyConfiguration();
        this._bindEvents();
    };

    ShakaController.prototype._applyConfiguration = function () {
        if (!this.player) {
            return;
        }

        this.player.configure({
            streaming: {
                bufferingGoal: DEFAULT_BUFFER_CONFIG.bufferingGoal,
                rebufferingGoal: DEFAULT_BUFFER_CONFIG.rebufferingGoal,
                bufferBehind: DEFAULT_BUFFER_CONFIG.bufferBehind,
                retryParameters: {
                    timeout: 30000,
                    maxAttempts: 3,
                    baseDelay: 1000,
                    backoffFactor: 2,
                    fuzzFactor: 0.5
                }
            },
            manifest: {
                retryParameters: {
                    timeout: 30000,
                    maxAttempts: 3
                }
            }
        });
    };

    ShakaController.prototype._bindEvents = function () {
        var self = this;

        if (!this.player) {
            return;
        }

        this.player.addEventListener('error', function (event) {
            Logger.error('Shaka error', event.detail);
        });

        this.player.addEventListener('trackschanged', function () {
            self._emit('variantchanged');
        });

        this.video.addEventListener('timeupdate', function () {
            self._updateLiveState();
        });

        this.jumpButton = document.getElementById('playerJumpToLive');
        if (this.jumpButton) {
            this.jumpButton.addEventListener('click', function () {
                self.seekToLiveEdge();
            });
        }
    };

    ShakaController.prototype._updateLiveState = function () {
        if (!this.isLive) {
            if (this.jumpButton) {
                this.jumpButton.classList.add('hidden');
            }
            return;
        }

        var range = this.player.seekRange();
        var liveEdge = range.end;
        var currentTime = this.video.currentTime;
        var nearLive = (liveEdge - currentTime) <= 5;

        if (this.jumpButton) {
            if (nearLive) {
                this.jumpButton.classList.add('hidden');
            } else {
                this.jumpButton.classList.remove('hidden');
            }
        }
    };

    ShakaController.prototype.load = function (manifestUrl, options) {
        var self = this;

        if (!this.player) {
            return Promise.reject(new Error('Shaka Player not initialised'));
        }

        options = options || {};
        this.isLive = !!options.isLive;
        this.dvrWindow = options.dvrWindow || null;

        if (this.isLive) {
            this.player.configure({
                streaming: {
                    bufferingGoal: 12,
                    rebufferingGoal: 3,
                    bufferBehind: options.bufferBehind || 45,
                    lowLatencyMode: false
                },
                manifest: {
                    defaultPresentationDelay: options.presentationDelay || 10
                }
            });
        } else {
            this._applyConfiguration();
        }

        return this.player.load(manifestUrl).then(function () {
            Logger.info('Shaka manifest loaded', { live: self.isLive });

            if (options.startTime) {
                self.video.currentTime = options.startTime;
            } else if (self.isLive) {
                self.seekToLiveEdge();
            }

            return self._collectTracks();
        });
    };

    ShakaController.prototype._collectTracks = function () {
        if (!this.player) {
            return [];
        }

        return this.player.getVariantTracks().map(function (track) {
            return {
                id: track.id,
                language: track.language,
                height: track.height,
                bandwidth: track.bandwidth,
                active: track.active
            };
        });
    };

    ShakaController.prototype.getTracks = function () {
        return this._collectTracks();
    };

    ShakaController.prototype.selectTrackByHeight = function (height) {
        if (!this.player) {
            return;
        }

        var tracks = this.player.getVariantTracks();
        var selected = null;
        var i;

        if (height === 'auto') {
            this.player.configure({ abr: { enabled: true } });
            return;
        }

        for (i = 0; i < tracks.length; i += 1) {
            if (tracks[i].height === height) {
                selected = tracks[i];
                break;
            }
        }

        if (selected) {
            this.player.configure({ abr: { enabled: false } });
            this.player.selectVariantTrack(selected, /* clearBuffer */ true);
        }
    };

    ShakaController.prototype.seekToLiveEdge = function () {
        if (!this.player || !this.isLive) {
            return;
        }

        var range = this.player.seekRange();
        var liveEdge = range.end;
        this.video.currentTime = liveEdge;
    };

    ShakaController.prototype.getSeekRange = function () {
        if (!this.player) {
            return null;
        }

        var range = this.player.seekRange();

        return {
            start: toSeconds(range.start),
            end: toSeconds(range.end),
            duration: toSeconds(range.end - range.start)
        };
    };

    ShakaController.prototype.destroy = function () {
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
    };

    App.ShakaController = ShakaController;
}(window, document));

