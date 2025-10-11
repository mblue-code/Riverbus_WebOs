/*
 * Memory monitor to track heap usage and trigger cleanup callbacks.
 */
(function (window) {
    'use strict';

    var App = window.App = window.App || {};
    var Logger = App.Logger || console;

    function MemoryMonitor(options) {
        this.interval = (options && options.interval) || 30000;
        this.threshold = (options && options.threshold) || 0.8;
        this.callbacks = [];
        this.timer = null;
    }

    MemoryMonitor.prototype.start = function () {
        if (this.timer) {
            return;
        }
        var self = this;
        this.timer = setInterval(function () {
            self._check();
        }, this.interval);
    };

    MemoryMonitor.prototype.stop = function () {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    };

    MemoryMonitor.prototype.onWarning = function (callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
        }
    };

    MemoryMonitor.prototype._check = function () {
        if (!window.performance || !window.performance.memory) {
            return;
        }
        var memory = window.performance.memory;
        var usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

        Logger.debug('Memory usage', {
            used: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            percent: Math.round(usage * 100)
        });

        if (usage >= this.threshold) {
            for (var i = 0; i < this.callbacks.length; i += 1) {
                try {
                    this.callbacks[i](usage);
                } catch (error) {
                    Logger.warn('Memory warning callback failed', error);
                }
            }
        }
    };

    App.MemoryMonitor = MemoryMonitor;
}(window));

