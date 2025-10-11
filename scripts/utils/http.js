/*
 * HTTP utility with fetch/XHR fallback, retry, and backoff logic.
 */
(function (window) {
    'use strict';

    var App = window.App = window.App || {};
    var Logger = App.Logger || console;

    var DEFAULT_TIMEOUT = 30000;
    var DEFAULT_RETRY = {
        maxAttempts: 3,
        baseDelay: 500,
        backoffFactor: 2,
        fuzzFactor: 0.4
    };

    function assign(target) {
        for (var i = 1; i < arguments.length; i += 1) {
            var source = arguments[i];
            if (!source) {
                continue;
            }
            for (var key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    target[key] = source[key];
                }
            }
        }
        return target;
    }

    function delay(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function withTimeout(promise, timeout) {
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () {
                reject(new Error('Request timeout'));
            }, timeout);

            promise.then(function (value) {
                clearTimeout(timer);
                resolve(value);
            }).catch(function (error) {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    function fetchRequest(url, options) {
        if (typeof fetch !== 'function') {
            return Promise.reject(new Error('Fetch not supported'));
        }
        return fetch(url, options);
    }

    function xhrRequest(url, options) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(options.method || 'GET', url, true);
            xhr.timeout = options.timeout || DEFAULT_TIMEOUT;

            if (options.headers) {
                for (var header in options.headers) {
                    if (Object.prototype.hasOwnProperty.call(options.headers, header)) {
                        xhr.setRequestHeader(header, options.headers[header]);
                    }
                }
            }

            xhr.withCredentials = options.credentials === 'include';

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    resolve({
                        ok: xhr.status >= 200 && xhr.status < 300,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        url: url,
                        headers: {
                            get: function (name) {
                                return xhr.getResponseHeader(name);
                            }
                        },
                        json: function () {
                            return Promise.resolve().then(function () {
                                return xhr.responseText ? JSON.parse(xhr.responseText) : {};
                            });
                        },
                        text: function () {
                            return Promise.resolve(xhr.responseText);
                        }
                    });
                }
            };

            xhr.onerror = function () {
                reject(new Error('Network error'));
            };

            xhr.ontimeout = function () {
                reject(new Error('Request timeout'));
            };

            xhr.send(options.body || null);
        });
    }

    function execute(url, options) {
        var requestOptions = assign({
            credentials: 'include'
        }, options || {});

        if (!requestOptions.timeout) {
            requestOptions.timeout = DEFAULT_TIMEOUT;
        }

        var requestPromise;

        if (requestOptions.forceXHR) {
            requestPromise = xhrRequest(url, requestOptions);
        } else {
            requestPromise = fetchRequest(url, requestOptions).catch(function () {
                return xhrRequest(url, requestOptions);
            });
        }

        return withTimeout(requestPromise, requestOptions.timeout);
    }

    function requestJson(url, options) {
        return execute(url, options).then(function (response) {
            if (!response.ok) {
                var error = new Error('HTTP ' + response.status);
                error.status = response.status;
                throw error;
            }
            return response.json();
        });
    }

    function withRetry(fn, retryConfig) {
        var config = assign({}, DEFAULT_RETRY, retryConfig || {});

        return new Promise(function (resolve, reject) {
            var attempt = 0;

            function run() {
                attempt += 1;
                fn().then(resolve).catch(function (error) {
                    if (attempt >= config.maxAttempts) {
                        reject(error);
                        return;
                    }

                    var jitter = (Math.random() * config.fuzzFactor) + 1;
                    var delayMs = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1) * jitter;
                    Logger.warn('Retrying request', {
                        attempt: attempt,
                        error: error.message,
                        delay: Math.round(delayMs)
                    });
                    delay(delayMs).then(run);
                });
            }

            run();
        });
    }

    App.Http = {
        request: execute,
        requestJson: requestJson,
        withRetry: withRetry,
        setDefaults: function (config) {
            if (config && config.timeout) {
                DEFAULT_TIMEOUT = config.timeout;
            }
            if (config && config.retry) {
                DEFAULT_RETRY = assign({}, DEFAULT_RETRY, config.retry);
            }
        }
    };
}(window));
