/*
 * Throttle and debounce helpers for performance management.
 */
(function (window) {
    'use strict';

    var App = window.App = window.App || {};

    function throttle(fn, wait) {
        var inFlight = false;
        var pending;

        return function () {
            var context = this;
            var args = arguments;

            if (inFlight) {
                pending = { context: context, args: args };
                return;
            }

            inFlight = true;
            fn.apply(context, args);

            setTimeout(function () {
                inFlight = false;
                if (pending) {
                    fn.apply(pending.context, pending.args);
                    pending = null;
                }
            }, wait);
        };
    }

    function debounce(fn, wait, immediate) {
        var timeout;
        return function () {
            var context = this;
            var args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) {
                    fn.apply(context, args);
                }
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) {
                fn.apply(context, args);
            }
        };
    }

    App.Throttle = {
        throttle: throttle,
        debounce: debounce
    };
}(window));

