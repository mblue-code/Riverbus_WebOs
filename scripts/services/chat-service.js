(function (window) {
    'use strict';

    var App = window.App = window.App || {};
    var Logger = App.Logger || console;

    var DEFAULT_OPTIONS = {
        sampleMode: false,
        sampleUser: {
            id: 'guest',
            displayName: 'Guest'
        },
        apiClient: null,
        logger: Logger,
        socketUrl: 'https://chat.floatplane.com',
        socketPath: '/sails.io/',
        reconnect: {
            enabled: true,
            maxAttempts: 5,
            baseDelay: 2000,
            backoffFactor: 1.8,
            jitter: 0.4
        }
    };

    var SAMPLE_MESSAGES = [
        { id: 'sample-1', user: 'Floatplane Bot', text: 'Welcome to the Floatplane livestream! 🎉', system: true },
        { id: 'sample-2', user: 'Colin', text: 'That new server rack looks amazing!' },
        { id: 'sample-3', user: 'Dan', text: 'Remember to smash that like button. 👍' },
        { id: 'sample-4', user: 'Sarah', text: 'Audio mix is on point today.' }
    ];

    function createId(prefix) {
        return prefix + '-' + Math.random().toString(36).slice(2, 10);
    }

    function mergeOptions(base, overrides) {
        var result = {};
        var key;
        for (key in base) {
            if (Object.prototype.hasOwnProperty.call(base, key)) {
                result[key] = base[key];
            }
        }
        for (key in overrides || {}) {
            if (Object.prototype.hasOwnProperty.call(overrides, key)) {
                result[key] = overrides[key];
            }
        }
        return result;
    }

    function ChatService(options) {
        this.options = mergeOptions(DEFAULT_OPTIONS, options);
        this.sampleMode = !!this.options.sampleMode;
        this.connected = false;
        this.channelId = null;
        this.messages = [];
        this.viewerCount = 0;
        this.listeners = {
            status: [],
            message: [],
            viewer: []
        };
        this.simulationTimer = null;
        this._socket = null;
        this._chatToken = null;
        this._reconnectAttempts = 0;
        this._reconnectTimer = null;
        this._logger = this.options.logger || Logger;
        this.apiClient = this.options.apiClient || null;

        if (!window.io) {
            this._logger.warn('Socket.IO client library not found. Chat will remain in sample mode.');
            this.sampleMode = true;
            this.options.sampleMode = true;
        }
    }

    ChatService.prototype.setSampleMode = function (flag) {
        this.sampleMode = !!flag;
        this.options.sampleMode = this.sampleMode;
    };

    ChatService.prototype.on = function (eventName, handler) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(handler);
    };

    ChatService.prototype._emit = function (eventName, payload) {
        var handlers = this.listeners[eventName] || [];
        for (var i = 0; i < handlers.length; i += 1) {
            try {
                handlers[i](payload);
            } catch (error) {
                this._logger.warn('ChatService listener error', eventName, error);
            }
        }
    };

    ChatService.prototype._emitStatus = function (status, details) {
        this._emit('status', {
            status: status,
            details: details || null
        });
    };

    ChatService.prototype._emitMessage = function (message) {
        this.messages.push(message);
        if (this.messages.length > 300) {
            this.messages.shift();
        }
        this._emit('message', this.messages.slice());
    };

    ChatService.prototype._emitViewer = function (count) {
        this.viewerCount = count;
        this._emit('viewer', count);
    };

    ChatService.prototype._emitSystemMessage = function (text) {
        this._emitMessage({
            id: createId('sys'),
            user: 'System',
            text: text,
            system: true
        });
    };

    ChatService.prototype.connect = function (channelId, options) {
        this.disconnect();
        this.channelId = channelId;
        this.messages = [];
        this.viewerCount = 0;
        this.connected = false;
        this._emit('message', this.messages.slice());
        this._emitViewer(0);
        this._emitStatus('connecting', { channelId: channelId });

        if (this.sampleMode || !channelId) {
            this._logger.info('ChatService operating in sample mode');
            this.connected = true;
            this._bootstrapSampleConversation();
            return Promise.resolve({ sample: true });
        }

        if (!this.apiClient || typeof this.apiClient.fetchChatToken !== 'function') {
            this._logger.warn('ChatService missing Floatplane API client. Falling back to sample mode.');
            this.setSampleMode(true);
            this.connected = true;
            this._bootstrapSampleConversation();
            return Promise.resolve({ sample: true, fallback: true });
        }

        return this._retrieveChatToken(channelId).then(function () {
            return this._openSocket(channelId);
        }.bind(this)).catch(function (error) {
            this._logger.warn('ChatService failed to start live chat', error);
            this.setSampleMode(true);
            this.connected = true;
            this._bootstrapSampleConversation();
            this._emitSystemMessage('Live chat unavailable. Showing sample messages instead.');
            return { sample: true, fallback: true };
        }.bind(this));
    };

    ChatService.prototype._retrieveChatToken = function (channelId) {
        var self = this;
        return this.apiClient.fetchChatToken(channelId).then(function (data) {
            if (!data || !data.token) {
                throw new Error('Chat token missing');
            }
            self._chatToken = data.token;
            return data.token;
        });
    };

    ChatService.prototype._openSocket = function (channelId) {
        var self = this;
        if (!window.io) {
            return Promise.reject(new Error('socket.io unavailable'));
        }

        this._socket = window.io(this.options.socketUrl, {
            path: this.options.socketPath,
            transports: ['websocket'],
            auth: {
                token: this._chatToken
            }
        });

        this._wireSocketEvents(channelId);
        return Promise.resolve({ live: true });
    };

    ChatService.prototype._wireSocketEvents = function (channelId) {
        var self = this;
        if (!this._socket) {
            return;
        }

        this._socket.on('connect', function () {
            self.connected = true;
            self._reconnectAttempts = 0;
            self._emitStatus('connected', { mode: 'live' });
            self._joinChannel(channelId);
        });

        this._socket.on('disconnect', function () {
            self.connected = false;
            self._emitStatus('disconnected');
            if (self._shouldReconnect()) {
                self._scheduleReconnect(channelId);
            }
        });

        this._socket.on('connect_error', function (error) {
            self._logger.warn('ChatService socket connect error', error);
            self.connected = false;
            self._emitStatus('error', {
                message: error && (error.message || error.type) || 'connect_error'
            });
            if (self._shouldReconnect()) {
                self._scheduleReconnect(channelId);
            }
        });

        this._socket.on('error', function (error) {
            self._logger.warn('ChatService socket error', error);
        });

        this._socket.on('chat:viewerCount', function (payload) {
            var count = payload && typeof payload.count === 'number' ? payload.count : 0;
            self._emitViewer(count);
        });

        this._socket.on('chat:message', function (payload) {
            if (!payload) {
                return;
            }
            self._emitMessage({
                id: payload.id || createId('msg'),
                user: payload.username || payload.user || 'Viewer',
                badges: payload.badges || [],
                text: payload.message || payload.text || '',
                timestamp: payload.createdAt || new Date().toISOString()
            });
        });

        this._socket.on('pollOpen', function (payload) {
            self._emit('pollOpen', payload);
        });

        this._socket.on('pollUpdateTally', function (payload) {
            self._emit('pollUpdate', payload);
        });

        this._socket.on('pollClose', function (payload) {
            self._emit('pollClose', payload);
        });
    };

    ChatService.prototype._joinChannel = function (channelId) {
        if (!this._socket || !channelId) {
            return;
        }
        try {
            this._socket.emit('get', {
                url: '/api/v3/chat/join',
                data: { streamId: channelId }
            }, function (response) {
                if (!response || response.status !== 200) {
                    this._logger.warn('Chat join response', response);
                }
            }.bind(this));
        } catch (error) {
            this._logger.warn('Chat join failed', error);
        }
    };

    ChatService.prototype._shouldReconnect = function () {
        return this.options.reconnect.enabled && this._reconnectAttempts < this.options.reconnect.maxAttempts;
    };

    ChatService.prototype._scheduleReconnect = function (channelId) {
        var self = this;
        this._reconnectAttempts += 1;
        var backoff = Math.pow(this.options.reconnect.backoffFactor, this._reconnectAttempts - 1);
        var jitter = 1 + ((Math.random() - 0.5) * this.options.reconnect.jitter);
        var delay = this.options.reconnect.baseDelay * backoff * jitter;

        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
        }

        this._emitStatus('reconnecting', {
            attempt: this._reconnectAttempts,
            delay: Math.round(delay)
        });

        this._reconnectTimer = setTimeout(function () {
            self._logger.info('ChatService reconnecting attempt', self._reconnectAttempts);
            self._retrieveChatToken(channelId).then(function () {
                return self._openSocket(channelId);
            }).catch(function (error) {
                self._logger.warn('ChatService reconnection failed', error);
                if (!self._shouldReconnect()) {
                    self._emitSystemMessage('Live chat connection lost. Showing sample chat.');
                    self.setSampleMode(true);
                    self._bootstrapSampleConversation();
                } else {
                    self._scheduleReconnect(channelId);
                }
            });
        }, delay);
    };

    ChatService.prototype._bootstrapSampleConversation = function () {
        var cloned = SAMPLE_MESSAGES.slice();
        this._emitStatus('connected', { mode: 'sample' });
        this._emitViewer(428);
        for (var i = 0; i < cloned.length; i += 1) {
            this._emitMessage({
                id: cloned[i].id,
                user: cloned[i].user,
                text: cloned[i].text,
                system: cloned[i].system || false
            });
        }
        this._startSampleLoop();
    };

    ChatService.prototype._startSampleLoop = function () {
        var self = this;
        this._stopSampleLoop();
        this.simulationTimer = window.setInterval(function () {
            if (!self.connected || !self.sampleMode) {
                self._stopSampleLoop();
                return;
            }
            var message = {
                id: createId('sample'),
                user: pickRandomUser(),
                text: pickRandomMessage()
            };
            self._emitMessage(message);
            var wobble = Math.max(0, Math.round((Math.random() - 0.5) * 50));
            self._emitViewer(Math.max(0, self.viewerCount + wobble));
        }, 8000);
    };

    ChatService.prototype._stopSampleLoop = function () {
        if (this.simulationTimer) {
            window.clearInterval(this.simulationTimer);
            this.simulationTimer = null;
        }
    };

    ChatService.prototype.disconnect = function () {
        this.connected = false;
        this.channelId = null;
        this._stopSampleLoop();
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }

        if (this._socket && typeof this._socket.disconnect === 'function') {
            try {
                this._socket.disconnect();
            } catch (error) {
                this._logger.warn('ChatService socket disconnect failed', error);
            }
        }

        this._socket = null;
        this._emitStatus('disconnected');
    };

    ChatService.prototype.sendMessage = function (text, context) {
        if (!text) {
            return false;
        }

        if (!this.connected) {
            this._emitSystemMessage('Chat is not connected.');
            return false;
        }

        if (this.sampleMode) {
            this._emitMessage({
                id: createId('local'),
                user: (context && context.displayName) || this.options.sampleUser.displayName || 'You',
                text: text,
                local: true
            });
            return true;
        }

        if (this._socket) {
            try {
                this._socket.emit('post', {
                    url: '/api/v3/chat/message',
                    data: {
                        streamId: this.channelId,
                        message: text
                    }
                });
                return true;
            } catch (error) {
                this._logger.warn('ChatService send failed', error);
                this._emitSystemMessage('Unable to send message.');
            }
        } else {
            this._emitSystemMessage('Chat server is offline.');
        }

        return false;
    };

    ChatService.prototype.getMessages = function () {
        return this.messages.slice();
    };

    ChatService.prototype.getViewerCount = function () {
        return this.viewerCount;
    };

    function pickRandomUser() {
        var names = ['Linus', 'Madison', 'James', 'Nick', 'Alex', 'Edzel', 'Anthony'];
        return names[Math.floor(Math.random() * names.length)];
    }

    function pickRandomMessage() {
        var samples = [
            'Anyone else watching on the couch? 🙌',
            'This makes me want to build a new NAS.',
            'The lighting in the lab looks so good today.',
            'Can we get a behind-the-scenes tour next?',
            'Floatplane on webOS is such a game changer!',
            'Audio is super clear, nice work team.'
        ];
        return samples[Math.floor(Math.random() * samples.length)];
    }

    App.ChatService = ChatService;
}(window));


