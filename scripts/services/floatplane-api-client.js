(function (window) {
    'use strict';

    var App = window.App = window.App || {};
    var Logger = App.Logger || console;
    var Http = App.Http;
    var Storage = App.StorageService;

    var DEFAULT_CONFIG = {
        baseUrl: 'https://www.floatplane.com/api',
        userAgent: 'FloatyClient/1.0.0 CFNetwork/1406.0.4 Darwin/22.6.0',
        sessionKey: 'fp_session',
        csrfKey: 'fp_csrf',
        timeout: 30000,
        retry: {
            maxAttempts: 4,
            baseDelay: 600,
            backoffFactor: 2,
            fuzzFactor: 0.5
        }
    };

    if (App && App._pendingApiUserAgent) {
        DEFAULT_CONFIG.userAgent = App._pendingApiUserAgent;
        App._pendingApiUserAgent = null;
    }

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

    function extractCookieValue(cookieHeader, name) {
        if (!cookieHeader || !name) {
            return null;
        }
        var escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        var regex = new RegExp(escaped + '=([^;]+)', 'i');
        var match = cookieHeader.match(regex);
        return match ? match[1] : null;
    }

    function extractSetCookieHeader(response) {
        if (!response) {
            return '';
        }
        var headerValue = '';
        try {
            if (response.headers && typeof response.headers.get === 'function') {
                headerValue = response.headers.get('set-cookie')
                    || response.headers.get('Set-Cookie')
                    || '';
            }
        } catch (error) {
            if (Logger && typeof Logger.warn === 'function') {
                Logger.warn('[FloatplaneAPI] Unable to access Set-Cookie header', error);
            }
        }
        if (!headerValue && typeof response.rawHeaders === 'string') {
            var lines = response.rawHeaders.split(/\r?\n/);
            for (var i = 0; i < lines.length; i += 1) {
                var line = lines[i];
                if (line && /^set-cookie:/i.test(line)) {
                    var parts = line.split(':');
                    parts.shift();
                    headerValue = parts.join(':').trim();
                    if (headerValue) {
                        break;
                    }
                }
            }
        }
        return headerValue || '';
    }

    function buildQuery(params) {
        if (!params) {
            return '';
        }
        var parts = [];
        for (var key in params) {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                var value = params[key];
                if (value !== undefined && value !== null) {
                    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
                }
            }
        }
        return parts.join('&');
    }

    var GLOBAL_OPTIONS = null;

    function FloatplaneApiClient(config) {
        this.options = assign({}, DEFAULT_CONFIG, GLOBAL_OPTIONS || {}, config || {});
        this.baseUrl = this.options.baseUrl.replace(/\/$/, '');
        this.session = Storage ? Storage.get(this.options.sessionKey, null) : null;
        this.csrfToken = Storage ? Storage.get(this.options.csrfKey, null) : null;
    }

    FloatplaneApiClient.setGlobalOptions = function (options) {
        GLOBAL_OPTIONS = assign({}, GLOBAL_OPTIONS || {}, options || {});
    };

    FloatplaneApiClient.prototype._log = function (level, message, data) {
        if (!Logger || typeof Logger[level] !== 'function') {
            return;
        }
        if (data) {
            Logger[level]('[FloatplaneAPI] ' + message, data);
        } else {
            Logger[level]('[FloatplaneAPI] ' + message);
        }
    };

    FloatplaneApiClient.prototype._updateSession = function (patch) {
        this.session = assign({}, this.session || {}, patch || {});
        if (Storage) {
            Storage.set(this.options.sessionKey, this.session);
        }
        return this.session;
    };

    FloatplaneApiClient.prototype._storeCsrf = function (token) {
        this.csrfToken = token || null;
        if (Storage) {
            if (token) {
                Storage.set(this.options.csrfKey, token);
            } else {
                Storage.remove(this.options.csrfKey);
            }
        }
    };

    FloatplaneApiClient.prototype._applySetCookie = function (response) {
        var header = extractSetCookieHeader(response);
        if (!header) {
            return;
        }
        var sailsSid = extractCookieValue(header, 'sails.sid');
        var csrf = extractCookieValue(header, 'csrfToken');
        if (sailsSid) {
            this._updateSession({
                token: sailsSid,
                rawCookie: 'sails.sid=' + sailsSid,
                pendingTwoFactor: false,
                provisionalCookie: null
            });
        }
        if (csrf) {
            this._storeCsrf(csrf);
        }
    };

    FloatplaneApiClient.prototype._getCookieHeader = function () {
        if (this.session && this.session.rawCookie) {
            return this.session.rawCookie;
        }
        if (this.session && this.session.token) {
            return 'sails.sid=' + this.session.token;
        }
        return null;
    };

    FloatplaneApiClient.prototype._buildHeaders = function (overrides) {
        var headers = assign({
            Accept: 'application/json'
        }, overrides || {});
        var cookie = this._getCookieHeader();
        if (cookie && !headers.Cookie) {
            headers.Cookie = cookie;
        }
        if (this.csrfToken && !headers['X-CSRF-Token']) {
            headers['X-CSRF-Token'] = this.csrfToken;
        }

        return headers;
    };

    FloatplaneApiClient.prototype._request = function (method, path, options) {
        if (!Http || typeof Http.request !== 'function') {
            return Promise.reject(new Error('HTTP module unavailable'));
        }

        var self = this;
        var url = path.indexOf('http') === 0 ? path : (this.baseUrl + path);
        var requestOptions = assign({
            method: method,
            headers: this._buildHeaders(options && options.headers),
            body: options && options.body ? options.body : undefined,
            timeout: this.options.timeout,
            forceXHR: options && options.forceXHR
        }, options || {});

        this._log('info', 'HTTP request', {
            method: requestOptions.method,
            url: url,
            userAgent: this.options.userAgent
        });

        var exec = function () {
            return Http.request(url, requestOptions).then(function (response) {
                self._applySetCookie(response);

                if (response.status === 401) {
                    self._log('warn', 'Received 401 response');
                    self.logout();
                    var error401 = new Error('AUTH_FAILED');
                    error401.status = 401;
                    throw error401;
                }

                if (!response.ok && response.status >= 400) {
                    if (response.status === 400 && response.json) {
                        return response.json().catch(function () {
                            return null;
                        }).then(function (body) {
                            var message = 'HTTP 400';
                            if (body && body.message) {
                                message = body.message;
                            } else if (body && body.errors && body.errors.length && body.errors[0].message) {
                                message = body.errors[0].message;
                            }
                            var error400 = new Error(message);
                            error400.status = 400;
                            error400.responseBody = body;
                            throw error400;
                        });
                    }
                    var error = new Error('HTTP ' + response.status);
                    error.status = response.status;
                    throw error;
                }

                if (options && options.rawResponse) {
                    return response;
                }
                return response.json();
            });
        };

        if (Http.withRetry && (!options || options.retry !== false)) {
            return Http.withRetry(exec, this.options.retry);
        }
        return exec();
    };

    FloatplaneApiClient.prototype._postJson = function (path, payload, options) {
        return this._request('POST', path, assign({
            headers: this._buildHeaders({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(payload || {})
        }, options || {}));
    };

    FloatplaneApiClient.prototype.login = function (username, password, twoFactorToken, captchaToken) {
        var self = this;
        if (!username || !password) {
            return Promise.reject(new Error('Missing credentials'));
        }

        var payload = {
            username: username,
            password: password
        };
        if (twoFactorToken) {
            payload.twoFactorToken = twoFactorToken;
        }
        if (captchaToken) {
            payload.captchaToken = captchaToken;
        }

        return this._postJson('/v2/auth/login', payload, { forceXHR: true }).then(function (data) {
            if (!data) {
                throw new Error('Empty authentication response');
            }

            if (data.requiresTwoFactor) {
                self._updateSession({
                    pendingTwoFactor: true,
                    token: data.token || (self.session && self.session.token) || null,
                    username: username,
                    provisionalCookie: self._getCookieHeader()
                });
                return {
                    requiresTwoFactor: true,
                    message: data.message || 'Two-factor authentication required.'
                };
            }

            var user = data.user || { displayName: username, email: username };
            var sessionToken = data.sessionToken || (self.session && self.session.token) || null;
            if (sessionToken) {
                self._updateSession({
                    token: sessionToken,
                    rawCookie: 'sails.sid=' + sessionToken
                });
            }

            self._updateSession({
                user: user,
                pendingTwoFactor: false,
                username: username
            });

            return {
                user: user,
                token: self.getSessionToken()
            };
        });
    };

    FloatplaneApiClient.prototype.verifyTwoFactor = function (code) {
        var self = this;
        if (!this.session || !this.session.pendingTwoFactor || !code) {
            return Promise.reject(new Error('No two-factor session'));
        }

        var headers = this._buildHeaders({
            'Content-Type': 'application/json',
            Cookie: this.session.provisionalCookie || this._getCookieHeader()
        });

        return this._request('POST', '/v2/auth/factor', {
            headers: headers,
            body: JSON.stringify({
                token: this.session.token,
                code: code
            }),
            forceXHR: true
        }).then(function (data) {
            var user = data && data.user ? data.user : {
                displayName: self.session.username,
                email: self.session.username
            };
            var sessionToken = data && data.sessionToken ? data.sessionToken : null;

            if (sessionToken) {
                self._updateSession({
                    token: sessionToken,
                    rawCookie: 'sails.sid=' + sessionToken
                });
            }

            self._updateSession({
                user: user,
                pendingTwoFactor: false,
                provisionalCookie: null
            });

            return {
                user: user,
                token: self.getSessionToken()
            };
        });
    };

    FloatplaneApiClient.prototype.logout = function () {
        this.session = null;
        if (Storage) {
            Storage.remove(this.options.sessionKey);
        }
        this._storeCsrf(null);
    };

    FloatplaneApiClient.prototype.isAuthenticated = function () {
        return !!(this.session && this.session.user && this.session.token);
    };

    FloatplaneApiClient.prototype.getUser = function () {
        if (this.session && this.session.user) {
            return this.session.user;
        }
        return null;
    };

    FloatplaneApiClient.prototype.getSessionToken = function () {
        if (this.session && this.session.token) {
            return this.session.token;
        }
        if (Storage) {
            var stored = Storage.get(this.options.sessionKey, null);
            if (stored && stored.token) {
                this.session = assign({}, stored);
                return stored.token;
            }
        }
        return null;
    };

    FloatplaneApiClient.prototype.getSessionCookie = function () {
        return this._getCookieHeader();
    };

    FloatplaneApiClient.prototype.getCsrfToken = function () {
        if (this.csrfToken) {
            return this.csrfToken;
        }
        if (Storage) {
            var stored = Storage.get(this.options.csrfKey, null);
            if (stored) {
                this.csrfToken = stored;
                return stored;
            }
        }
        return null;
    };

    FloatplaneApiClient.prototype.getUserSubscriptions = function (options) {
        var query = buildQuery(assign({
            includeDvrStatus: true,
            includeLivestream: true
        }, options || {}));
        return this._request('GET', '/v3/user/subscriptions' + (query ? '?' + query : ''));
    };

    FloatplaneApiClient.prototype.getCreatorContent = function (creatorId, options) {
        if (!creatorId) {
            return Promise.reject(new Error('Missing creatorId'));
        }
        var query = buildQuery(assign({
            id: creatorId,
            hasVideo: true,
            limit: 24
        }, options || {}));
        return this._request('GET', '/v3/content/creator' + (query ? '?' + query : ''));
    };

    FloatplaneApiClient.prototype.getVideoDeliveryInfo = function (videoId) {
        if (!videoId) {
            return Promise.reject(new Error('Missing videoId'));
        }
        var query = buildQuery({
            type: 'video',
            id: videoId
        });
        return this._request('GET', '/v2/cdn/delivery' + (query ? '?' + query : ''));
    };

    FloatplaneApiClient.prototype.resolveLivestream = function (streamId) {
        if (!streamId) {
            return Promise.reject(new Error('Missing streamId'));
        }
        return this._request('GET', '/v3/live/resolve?streamId=' + encodeURIComponent(streamId));
    };

    FloatplaneApiClient.prototype.fetchChatToken = function (streamId) {
        return this._request('POST', '/v3/chat/token', {
            headers: this._buildHeaders({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({ streamId: streamId || null })
        });
    };

    FloatplaneApiClient.prototype.refreshSession = function () {
        var self = this;
        if (!this.getSessionToken()) {
            return Promise.resolve(null);
        }
        return this._request('GET', '/v2/auth/status').then(function (data) {
            if (data && data.user) {
                self._updateSession({
                    user: data.user,
                    username: data.user.email || data.user.displayName || data.user.id
                });
                return data.user;
            }
            return null;
        }).catch(function (error) {
            if (error && error.status === 401) {
                self.logout();
            }
            throw error;
        });
    };

    FloatplaneApiClient.prototype.setBaseUrl = function (url) {
        if (!url) {
            return;
        }
        this.baseUrl = url.replace(/\/$/, '');
        this.options.baseUrl = this.baseUrl;
        this._log('info', 'API baseUrl changed to: ' + this.baseUrl);
    };

    FloatplaneApiClient.prototype.setUserAgent = function (userAgent) {
        if (!userAgent) {
            return;
        }
        this.options.userAgent = userAgent;
        this._log('info', 'API userAgent changed to: ' + userAgent);
    };

    App.FloatplaneApiClient = FloatplaneApiClient;
}(window));
