/**
 * Floatplane webOS TV App - Base Implementation
 * Provides authentication scaffolding, content browsing, and video playback
 * Designed for compatibility with webOS 4.0 (Chrome 53+) through webOS 24.
 */
(function () {
    'use strict';

    var App = window.App = window.App || {};
    var Logger = App.Logger;
    var ScreenLogger = App.ScreenLogger;
    var screenLoggerInstance = null;
    var ChatService = App.ChatService;
    var ViewingModeManager = App.ViewingModeManager;

    /**
     * Key codes for LG TV remotes and standard keyboards.
     * BACK key is 461, ESC fallback for development.
     */
    const KEY_CODES = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        ENTER: 13,
        SPACE: 32,
        BACK: 461,
        ESC: 27,
        PLAY_PAUSE: 415,
        PAUSE: 19,
        PLAY: 415
    };

    /**
     * Global configuration constants.
     */
    const CONFIG = {
        app: {
            version: '1.0.0',
            name: 'Floatplane for webOS',
            userAgent: null
        },
        api: {
            baseUrl: 'https://www.floatplane.com/api',
            timeout: 30000
        },
        video: {
            defaultQuality: 'auto',
            seekIncrement: 10,
            resumeThreshold: 30
        },
        ui: {
            controlsHideDelay: 5000
        },
        storage: {
            sessionKey: 'fp_session',
            progressPrefix: 'fp_progress_',
            sampleModeKey: 'fp_sample_mode'
        }
    };

    function overrideNavigatorUserAgent(value) {
        if (typeof navigator === 'undefined' || !navigator || !value) {
            return false;
        }
        try {
            Object.defineProperty(navigator, 'userAgent', {
                configurable: true,
                get: function () {
                    return value;
                }
            });
            return navigator.userAgent === value;
        } catch (error) {
            if (typeof navigator.__defineGetter__ === 'function') {
                try {
                    navigator.__defineGetter__('userAgent', function () {
                        return value;
                    });
                    return navigator.userAgent === value;
                } catch (innerError) {
                    if (Logger && typeof Logger.warn === 'function') {
                        Logger.warn('[App] Failed to override navigator.userAgent via legacy getter', innerError);
                    }
                }
            }
            if (Logger && typeof Logger.warn === 'function') {
                Logger.warn('[App] Unable to override navigator.userAgent', error);
            }
            return false;
        }
    }

    (function deriveUserAgent() {
        const base = 'FloatyClient/' + CONFIG.app.version;
        const original = (typeof navigator !== 'undefined' && navigator.userAgent)
            ? navigator.userAgent
            : 'unknown';
        const finalUserAgent = base + ' CFNetwork/1406.0.4 Darwin/22.6.0';
        const overrideApplied = overrideNavigatorUserAgent(finalUserAgent);
        CONFIG.app.userAgent = finalUserAgent;
        if (Logger && typeof Logger.info === 'function') {
            Logger.info('[App] Using user agent:', {
                final: finalUserAgent,
                original: original,
                overrideApplied: overrideApplied
            });
        }
        if (App.FloatplaneApiClient && typeof App.FloatplaneApiClient.setGlobalOptions === 'function') {
            App.FloatplaneApiClient.setGlobalOptions({ userAgent: CONFIG.app.userAgent });
        } else {
            App._pendingApiUserAgent = CONFIG.app.userAgent;
        }
        if (App._authService) {
            var client = App._authService.getClient ? App._authService.getClient() : App._authService;
            if (client && typeof client.setUserAgent === 'function') {
                client.setUserAgent(CONFIG.app.userAgent);
            }
        }
    }());

    function setApiBaseUrl(nextBaseUrl) {
        if (!nextBaseUrl || nextBaseUrl === CONFIG.api.baseUrl) {
            return;
        }
        CONFIG.api.baseUrl = nextBaseUrl;
        if (typeof Logger !== 'undefined' && Logger && typeof Logger.info === 'function') {
            Logger.info('Switched to CORS proxy:', nextBaseUrl);
        }
        if (App.FloatplaneApiClient && typeof App.FloatplaneApiClient.setGlobalOptions === 'function') {
            App.FloatplaneApiClient.setGlobalOptions({
                baseUrl: nextBaseUrl,
                userAgent: CONFIG.app.userAgent
            });
        }
    }

    // Expose CONFIG globally for testing
    window.CONFIG = CONFIG;

    /**
     * Fallback for Object.assign on older engines.
     */
    const assign = typeof Object.assign === 'function'
        ? Object.assign
        : function (target) {
            if (target === null || typeof target === 'undefined') {
                throw new TypeError('Cannot convert undefined or null to object');
            }
            const output = Object(target);
            for (let index = 1; index < arguments.length; index += 1) {
                const source = arguments[index];
                if (source !== null && typeof source !== 'undefined') {
                    for (const key in source) {
                        if (Object.prototype.hasOwnProperty.call(source, key)) {
                            output[key] = source[key];
                        }
                    }
                }
            }
            return output;
        };

    /**
     * Sample data for offline development and demonstrations.
     */
    const SAMPLE_DATA = {
        user: {
            id: 'sample-user',
            displayName: 'Sample Viewer',
            email: 'viewer@example.com'
        },
        creators: [
            {
                id: 'linus-tech-tips',
                name: 'Linus Tech Tips',
                slug: 'ltt',
                summary: 'Behind-the-scenes, labs updates, and exclusive tech breakdowns.',
                newPosts: 4
            },
            {
                id: 'shortcircuit',
                name: 'ShortCircuit',
                slug: 'sc',
                summary: 'Hardware unboxings and rapid-fire product impressions.',
                newPosts: 2
            },
            {
                id: 'lmg-clips',
                name: 'LMG Clips',
                slug: 'clips',
                summary: 'Best moments from livestreams and events.',
                newPosts: 5
            }
        ],
        videosByCreator: {
            'linus-tech-tips': [
                {
                    id: 'ltt-001',
                    title: 'Rack Overhaul - Lab Upgrade',
                    description: 'A deep dive into the Floatplane lab rebuild with new network hardware.',
                    duration: 1860,
                    publishedAt: '2025-01-12T19:00:00Z',
                    isLive: false,
                    qualities: ['1080p', '720p', '360p', 'auto'],
                    sources: [
                        {
                            quality: '1080p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                        },
                        {
                            quality: '720p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                        },
                        {
                            quality: '360p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                        },
                        {
                            quality: 'auto',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                        }
                    ]
                },
                {
                    id: 'ltt-live-001',
                    title: 'Live: Workshop Q&A',
                    description: 'An interactive session answering Floatplane community questions.',
                    duration: 0,
                    publishedAt: '2025-02-18T23:00:00Z',
                    isLive: true,
                    viewerCount: 1620,
                    qualities: ['auto'],
                    sources: [
                        {
                            quality: 'auto',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'
                        }
                    ]
                },
                {
                    id: 'ltt-002',
                    title: 'Creator Spotlight - Jake on Servers',
                    description: 'Jake walks through Floatplane\'s CDN and caching strategy upgrades.',
                    duration: 1420,
                    publishedAt: '2025-01-02T17:00:00Z',
                    isLive: false,
                    qualities: ['1080p', '720p', 'auto'],
                    sources: [
                        {
                            quality: '1080p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
                        },
                        {
                            quality: '720p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
                        },
                        {
                            quality: 'auto',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
                        }
                    ]
                }
            ],
            shortcircuit: [
                {
                    id: 'sc-101',
                    title: 'The Fastest Portable SSD? Real Benchmarks.',
                    description: 'Testing the latest USB4 SSD enclosure in Floatplane Labs.',
                    duration: 1180,
                    publishedAt: '2025-02-11T02:30:00Z',
                    isLive: false,
                    qualities: ['1080p', '720p', 'auto'],
                    sources: [
                        {
                            quality: '1080p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
                        },
                        {
                            quality: '720p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
                        },
                        {
                            quality: 'auto',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4'
                        }
                    ]
                },
                {
                    id: 'sc-102',
                    title: 'Micro Projectors Battle - 2025 Picks',
                    description: 'Comparing laser projectors for on-the-go movie nights.',
                    duration: 960,
                    publishedAt: '2025-01-29T15:15:00Z',
                    isLive: false,
                    qualities: ['1080p', '720p'],
                    sources: [
                        {
                            quality: '1080p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                        },
                        {
                            quality: '720p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                        }
                    ]
                }
            ],
            'lmg-clips': [
                {
                    id: 'clips-301',
                    title: 'Floatplane Studio Tour Highlights',
                    description: 'A quick look at new camera setups and lighting rigs.',
                    duration: 420,
                    publishedAt: '2025-02-02T06:00:00Z',
                    isLive: false,
                    qualities: ['720p', '360p', 'auto'],
                    sources: [
                        {
                            quality: '720p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
                        },
                        {
                            quality: '360p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
                        },
                        {
                            quality: 'auto',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
                        }
                    ]
                },
                {
                    id: 'clips-302',
                    title: 'Behind the Scenes: Live Show Setup',
                    description: 'How Floatplane preps for live broadcasts in the studio.',
                    duration: 540,
                    publishedAt: '2025-02-14T12:45:00Z',
                    isLive: false,
                    qualities: ['720p', 'auto'],
                    sources: [
                        {
                            quality: '720p',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4'
                        },
                        {
                            quality: 'auto',
                            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4'
                        }
                    ]
                }
            ]
        }
    };

    /**
     * Simple logger with toggled verbosity.
     */
    const DefaultLogger = (function () {
        let enabled = true;
        function log(level, args) {
            if (!enabled) {
                return;
            }
            const prefix = '[Floatplane]';
            const params = Array.prototype.slice.call(args);
            params.unshift(prefix);
            if (typeof console[level] === 'function') {
                console[level].apply(console, params);
            } else {
                console.log.apply(console, params);
            }
        }
        return {
            enable: function () {
                enabled = true;
            },
            disable: function () {
                enabled = false;
            },
            info: function () {
                log('info', arguments);
            },
            warn: function () {
                log('warn', arguments);
            },
            error: function () {
                log('error', arguments);
            }
        };
    }());

    Logger = Logger || DefaultLogger;
    App.Logger = Logger;

    /**
     * Storage helper with JSON serialization and graceful failure handling.
     */
    const StorageService = {
        set: function (key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                Logger.warn('Storage set failed', key, error);
            }
        },
        get: function (key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                if (raw === null || typeof raw === 'undefined') {
                    return fallback;
                }
                return JSON.parse(raw);
            } catch (error) {
                Logger.warn('Storage get failed', key, error);
                return fallback;
            }
        },
        remove: function (key) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                Logger.warn('Storage remove failed', key, error);
            }
        },
        progressKey: function (videoId) {
            return CONFIG.storage.progressPrefix + videoId;
        },
        setProgress: function (videoId, payload) {
            this.set(this.progressKey(videoId), payload);
        },
        getProgress: function (videoId) {
            return this.get(this.progressKey(videoId), null);
        },
        clearProgress: function (videoId) {
            this.remove(this.progressKey(videoId));
        }
    };

    /**
     * Utility helpers.
     */
    function clamp(value, min, max) {
        if (value < min) {
            return min;
        }
        if (value > max) {
            return max;
        }
        return value;
    }

    function toArray(nodeList) {
        return Array.prototype.slice.call(nodeList || []);
    }

    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) {
            return '—';
        }
        const totalMinutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0) {
            return hours + 'h ' + (minutes < 10 ? '0' : '') + minutes + 'm';
        }
        return minutes + 'm ' + (remainingSeconds < 10 ? '0' : '') + remainingSeconds + 's';
    }

    function secondsToClock(value) {
        if (typeof value !== 'number' || isNaN(value)) {
            value = 0;
        }
        const totalSeconds = Math.max(0, Math.floor(value));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const parts = [];
        if (hours > 0) {
            parts.push(hours < 10 ? '0' + hours : String(hours));
        }
        parts.push(minutes < 10 ? '0' + minutes : String(minutes));
        parts.push(seconds < 10 ? '0' + seconds : String(seconds));
        return parts.join(':');
    }

    function formatTimecode(current, duration, isLive) {
        if (isLive) {
            return 'LIVE ' + secondsToClock(current);
        }
        const safeDuration = (typeof duration === 'number' && !isNaN(duration) && duration !== Infinity)
            ? duration
            : 0;
        return secondsToClock(current) + ' / ' + secondsToClock(safeDuration);
    }

    function formatPublishDate(isoString) {
        if (!isoString) {
            return 'Unknown';
        }
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            return 'Unknown';
        }
        try {
            return date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return date.getFullYear()
                + '-' + (month < 10 ? '0' + month : month)
                + '-' + (day < 10 ? '0' + day : day);
        }
    }

    function noop() {}

    const VirtualKeyboard = (function () {
        const platform = typeof window !== 'undefined' ? window.webOS : null;
        const rawKeyboardApi = platform && platform.keyboard ? platform.keyboard : null;
        const palmSystem = typeof window !== 'undefined' && window.PalmSystem ? window.PalmSystem : null;

        function resolveKeyboardApi(api) {
            if (!api) {
                return null;
            }
            if (typeof api === 'function') {
                try {
                    const instanceViaNew = new api();
                    if (instanceViaNew) {
                        return instanceViaNew;
                    }
                } catch (error) {
                    if (Logger && typeof Logger.info === 'function') {
                        Logger.info('[VirtualKeyboard] Keyboard constructor with new failed', error);
                    }
                }
                try {
                    const instanceViaCall = api();
                    if (instanceViaCall) {
                        return instanceViaCall;
                    }
                } catch (error) {
                    if (Logger && typeof Logger.info === 'function') {
                        Logger.info('[VirtualKeyboard] Keyboard constructor call failed', error);
                    }
                }
            }
            return api;
        }

        function resolveMethodName(api, candidates) {
            if (!api) {
                return null;
            }
            for (let i = 0; i < candidates.length; i += 1) {
                const methodName = candidates[i];
                if (typeof api[methodName] === 'function') {
                    return methodName;
                }
            }
            return null;
        }

        function invokeKeyboardMethod(methodName, config) {
            if (!keyboardApi || !methodName) {
                return false;
            }
            const method = keyboardApi[methodName];
            if (typeof method !== 'function') {
                return false;
            }
            if (method.length > 0) {
                method.call(keyboardApi, config);
            } else {
                method.call(keyboardApi);
            }
            return true;
        }

        const keyboardApi = resolveKeyboardApi(rawKeyboardApi);
        const showMethodName = resolveMethodName(keyboardApi, ['show', 'showKeyboard', 'open', 'relaunch', 'display']);
        const hideMethodName = resolveMethodName(keyboardApi, ['hide', 'hideKeyboard', 'close', 'dismiss', 'quit']);
        const manualKeyboardSetter = keyboardApi && typeof keyboardApi.setManualKeyboardEnabled === 'function'
            ? keyboardApi.setManualKeyboardEnabled.bind(keyboardApi)
            : null;
        const manualKeyboardGetter = keyboardApi && typeof keyboardApi.isManualKeyboardEnabled === 'function'
            ? keyboardApi.isManualKeyboardEnabled.bind(keyboardApi)
            : null;
        let manualKeyboardEnabled = null;
        if (manualKeyboardGetter) {
            try {
                manualKeyboardEnabled = manualKeyboardGetter();
            } catch (error) {
                manualKeyboardEnabled = null;
                if (Logger && typeof Logger.info === 'function') {
                    Logger.info('[VirtualKeyboard] isManualKeyboardEnabled check failed', error);
                }
            }
        }
        const supportsKeyboardApi = !!keyboardApi;
        const supportsPalm = !!(palmSystem && typeof palmSystem.showInputPanel === 'function');
        let activeElement = null;

        // DEBUG: Log keyboard API detection
        if (Logger && typeof Logger.info === 'function') {
            Logger.info('[VirtualKeyboard] Initialization:', {
                hasWebOS: !!window.webOS,
                hasPlatform: !!platform,
                hasKeyboardApi: !!rawKeyboardApi,
                resolvedKeyboardApi: !!keyboardApi,
                showMethodName: showMethodName,
                hideMethodName: hideMethodName,
                manualKeyboardAvailable: !!manualKeyboardSetter,
                manualKeyboardEnabled: manualKeyboardEnabled,
                supportsKeyboardApi: supportsKeyboardApi,
                hasPalmSystem: !!palmSystem,
                supportsPalm: supportsPalm
            });
        }

        if (manualKeyboardSetter) {
            const shouldEnableManual = !!showMethodName;
            try {
                manualKeyboardSetter(shouldEnableManual);
                if (Logger && typeof Logger.info === 'function') {
                    Logger.info('[VirtualKeyboard] Manual keyboard control set', {
                        enabled: shouldEnableManual
                    });
                }
            } catch (error) {
                if (Logger && typeof Logger.warn === 'function') {
                    Logger.warn('Failed to configure manual keyboard control', error);
                }
            }
        }

        function isTextualInput(element) {
            if (!element || !element.tagName) {
                return false;
            }
            const tag = element.tagName.toUpperCase();
            if (tag === 'TEXTAREA') {
                return true;
            }
            if (tag !== 'INPUT') {
                return false;
            }
            const type = (element.getAttribute('type') || 'text').toLowerCase();
            return type === 'text'
                || type === 'email'
                || type === 'password'
                || type === 'search'
                || type === 'tel'
                || type === 'url'
                || type === 'number';
        }

        function buildConfig(element) {
            const config = {
                qwerty: true,
                ime: false,
                enterOn: 'OK'
            };
            if (!element) {
                return config;
            }
            const inputType = (element.getAttribute('type') || '').toLowerCase();
            config.type = inputType === 'email' ? 'email'
                : inputType === 'password' ? 'password'
                : inputType === 'tel' || inputType === 'number' ? 'number'
                : 'text';
            const placeholder = element.getAttribute('placeholder') || '';
            if (placeholder) {
                config.title = placeholder;
            }
            if (element.hasAttribute('maxlength')) {
                const maxAttr = parseInt(element.getAttribute('maxlength'), 10);
                if (!isNaN(maxAttr) && maxAttr > 0) {
                    config.maxLength = maxAttr;
                }
            }
            return config;
        }

        function showFor(element) {
            if (!isTextualInput(element)) {
                return;
            }
            if (activeElement === element) {
                return;
            }
                try {
                    let shown = false;
                    if (supportsKeyboardApi && showMethodName) {
                        const config = buildConfig(element);
                        if (Logger && typeof Logger.info === 'function') {
                        Logger.info('[VirtualKeyboard] Showing webOS keyboard', {
                            type: config.type,
                            title: config.title || null,
                            method: showMethodName
                        });
                    }
                    shown = invokeKeyboardMethod(showMethodName, config);
                } else if (supportsPalm) {
                    if (Logger && typeof Logger.info === 'function') {
                        Logger.info('[VirtualKeyboard] Showing PalmSystem input panel');
                    }
                    palmSystem.showInputPanel();
                    shown = true;
                    }
                    if (!shown && element && typeof element.focus === 'function') {
                        try {
                            element.focus({ preventScroll: true });
                        } catch (focusError) {
                            element.focus();
                        }
                        if (Logger && typeof Logger.info === 'function') {
                            Logger.info('[VirtualKeyboard] Fallback to native focus for keyboard display');
                        }
                    }
            } catch (error) {
                if (Logger && typeof Logger.warn === 'function') {
                    Logger.warn('Failed to show virtual keyboard', error);
                }
            }
            activeElement = element;
        }

        function hide(force) {
            if (!force && !activeElement) {
                return;
            }
            try {
                let hidden = false;
                if (supportsKeyboardApi && hideMethodName) {
                    if (Logger && typeof Logger.info === 'function') {
                        Logger.info('[VirtualKeyboard] Hiding webOS keyboard', {
                            method: hideMethodName
                        });
                    }
                    hidden = invokeKeyboardMethod(hideMethodName);
                } else if (supportsPalm && typeof palmSystem.hideInputPanel === 'function') {
                    if (Logger && typeof Logger.info === 'function') {
                        Logger.info('[VirtualKeyboard] Hiding PalmSystem input panel');
                    }
                    palmSystem.hideInputPanel();
                    hidden = true;
                }
                if (!hidden && force && activeElement && typeof activeElement.blur === 'function') {
                    activeElement.blur();
                }
            } catch (error) {
                if (Logger && typeof Logger.warn === 'function') {
                    Logger.warn('Failed to hide virtual keyboard', error);
                }
            }
            activeElement = null;
        }

        function updateFor(element) {
            if (isTextualInput(element)) {
                showFor(element);
                return;
            }
            if (activeElement) {
                if (supportsKeyboardApi || supportsPalm) {
                    hide();
                } else {
                    activeElement = null;
                }
            }
        }

        function handleBlur(event) {
            if (!event || event.target !== activeElement) {
                return;
            }
            if (supportsKeyboardApi || supportsPalm) {
                hide();
            } else {
                activeElement = null;
            }
        }

        function register(element) {
            if (!element) {
                return;
            }
            element.addEventListener('blur', handleBlur, false);
        }

        return {
            isSupported: function () {
                return supportsKeyboardApi || supportsPalm;
            },
            update: updateFor,
            register: register,
            hide: function (force) {
                hide(force);
            }
        };
    }());

    /**
     * Focus manager to handle D-pad navigation.
     */
    const FocusManager = (function () {
        const groups = {};
        const listeners = [];
        let currentGroup = null;
        let currentIndex = 0;

        function registerGroup(name, options) {
            groups[name] = assign({
                type: 'list',
                columns: 1,
                elements: []
            }, options || {});
            refreshGroup(name);
        }

        function refreshGroup(name) {
            const config = groups[name];
            if (!config) {
                return;
            }
            config.elements = toArray(document.querySelectorAll('[data-focus-group="' + name + '"][data-focusable="true"]'));
            for (let index = 0; index < config.elements.length; index += 1) {
                const element = config.elements[index];
                const tagName = element.tagName ? element.tagName.toUpperCase() : '';
                if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
                    element.removeAttribute('tabindex');
                } else {
                    element.setAttribute('tabindex', '-1');
                }
                element.classList.remove('is-focused');
                element.setAttribute('data-focus-index', String(index));
            }
        }

        function getCurrentElement() {
            const config = groups[currentGroup];
            if (!config || !config.elements || !config.elements.length) {
                return null;
            }
            return config.elements[currentIndex] || null;
        }

        function notify() {
            const payload = {
                group: currentGroup,
                index: currentIndex,
                element: getCurrentElement()
            };
            for (let i = 0; i < listeners.length; i += 1) {
                try {
                    listeners[i](payload);
                } catch (error) {
                    Logger.warn('Focus listener error', error);
                }
            }
        }

        function applyFocus(element) {
            const focused = document.querySelectorAll('.is-focused');
            for (let i = 0; i < focused.length; i += 1) {
                if (focused[i] !== element) {
                    focused[i].classList.remove('is-focused');
                }
            }
            element.classList.add('is-focused');
            if (typeof element.focus === 'function') {
                try {
                    element.focus({ preventScroll: true });
                } catch (error) {
                    element.focus();
                }
            }
        }

        function setFocus(name, index) {
            const config = groups[name];
            if (!config) {
                return false;
            }
            if (!config.elements || !config.elements.length) {
                refreshGroup(name);
            }
            if (!config.elements.length) {
                return false;
            }
            const resolvedIndex = clamp(
                typeof index === 'number' ? index : 0,
                0,
                config.elements.length - 1
            );
            currentGroup = name;
            currentIndex = resolvedIndex;
            applyFocus(config.elements[resolvedIndex]);
            notify();
            return true;
        }

        function move(direction) {
            // DEBUG: Log focus manager move attempts
            if (Logger && typeof Logger.info === 'function') {
                Logger.info('[FocusManager] Move called:', {
                    direction: direction,
                    currentGroup: currentGroup,
                    currentIndex: currentIndex,
                    hasGroup: !!groups[currentGroup]
                });
            }

            const config = groups[currentGroup];
            if (!config || !config.elements || !config.elements.length) {
                if (Logger && typeof Logger.warn === 'function') {
                    Logger.warn('[FocusManager] No config or elements for group:', currentGroup);
                }
                return false;
            }
            let targetIndex = currentIndex;
            if (config.type === 'column') {
                if (direction === 'down' && currentIndex < config.elements.length - 1) {
                    targetIndex += 1;
                } else if (direction === 'up' && currentIndex > 0) {
                    targetIndex -= 1;
                } else {
                    return false;
                }
            } else if (config.type === 'list') {
                if ((direction === 'down' || direction === 'right') && currentIndex < config.elements.length - 1) {
                    targetIndex += 1;
                } else if ((direction === 'up' || direction === 'left') && currentIndex > 0) {
                    targetIndex -= 1;
                } else {
                    return false;
                }
            } else if (config.type === 'row') {
                if (direction === 'right' && currentIndex < config.elements.length - 1) {
                    targetIndex += 1;
                } else if (direction === 'left' && currentIndex > 0) {
                    targetIndex -= 1;
                } else {
                    return false;
                }
            } else if (config.type === 'grid') {
                const columns = config.columns || 1;
                if (direction === 'right') {
                    if (((currentIndex + 1) % columns) !== 0 && currentIndex + 1 < config.elements.length) {
                        targetIndex += 1;
                    } else {
                        return false;
                    }
                } else if (direction === 'left') {
                    if ((currentIndex % columns) !== 0) {
                        targetIndex -= 1;
                    } else {
                        return false;
                    }
                } else if (direction === 'down') {
                    if (currentIndex + columns < config.elements.length) {
                        targetIndex += columns;
                    } else {
                        return false;
                    }
                } else if (direction === 'up') {
                    if (currentIndex - columns >= 0) {
                        targetIndex -= columns;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
            currentIndex = targetIndex;
            applyFocus(config.elements[targetIndex]);
            notify();
            return true;
        }

        function getState() {
            return {
                group: currentGroup,
                index: currentIndex,
                element: getCurrentElement()
            };
        }

        function onChange(callback) {
            if (typeof callback === 'function') {
                listeners.push(callback);
            }
        }

        return {
            registerGroup: registerGroup,
            refreshGroup: refreshGroup,
            setFocus: setFocus,
            move: move,
            getState: getState,
            onChange: onChange,
            getFocusedElement: getCurrentElement
        };
    }());

    /**
     * Screen manager with simple stack history.
     */
    const ScreenManager = (function () {
        let current = 'login';
        const history = [];

        function show(screenName, options) {
            if (!screenName || screenName === current) {
                updateMode(screenName || current);
                return;
            }
            const currentEl = document.querySelector('[data-screen="' + current + '"]');
            const targetEl = document.querySelector('[data-screen="' + screenName + '"]');
            if (!targetEl) {
                Logger.warn('Screen not found', screenName);
                return;
            }
            if (currentEl) {
                currentEl.classList.remove('is-active');
            }
            targetEl.classList.add('is-active');
            if (!options || options.storeHistory !== false) {
                history.push(current);
            }
            current = screenName;
            updateMode(screenName);
            if (screenName !== 'login' && VirtualKeyboard && typeof VirtualKeyboard.hide === 'function') {
                VirtualKeyboard.hide();
            }
        }

        function back() {
            if (!history.length) {
                return null;
            }
            const previous = history.pop();
            show(previous, { storeHistory: false });
            return previous;
        }

        function reset() {
            history.length = 0;
        }

        function updateMode(mode) {
            const statusMode = document.getElementById('statusMode');
            if (statusMode) {
                statusMode.textContent = mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : 'Unknown';
            }
        }

        function currentScreen() {
            return current;
        }

        return {
            show: show,
            back: back,
            reset: reset,
            current: currentScreen
        };
    }());

    /**
     * Video player controller built on HTML5 video element.
     */
    function PlayerController(videoElement) {
        this.video = videoElement;
        this.container = document.getElementById('playerContainer');
        this.overlay = document.getElementById('playerOverlay');
        this.currentVideo = null;
        this.currentSource = null;
        this.currentQuality = CONFIG.video.defaultQuality;
        this.isLive = false;
        this.pendingResumeTime = null;
        this.controlsTimer = null;
        this.listeners = {
            timeupdate: [],
            ended: [],
            statechange: []
        };
        this.shakaController = (App.ShakaController && videoElement) ? new App.ShakaController(videoElement) : null;
        this._bindEvents();
    }

    PlayerController.prototype._bindEvents = function () {
        const self = this;
        if (!this.video) {
            return;
        }
        this.video.addEventListener('timeupdate', function () {
            self._emit('timeupdate', {
                currentTime: self.video.currentTime || 0,
                duration: self.video.duration || 0,
                isLive: self.isLive
            });
        });
        this.video.addEventListener('loadedmetadata', function () {
            if (self.pendingResumeTime && !self.isLive) {
                try {
                    self.video.currentTime = self.pendingResumeTime;
                } catch (error) {
                    Logger.warn('Failed to set resume time', error);
                }
            }
            self.pendingResumeTime = null;
            self.showControls(true);
            self._emit('statechange', { state: 'loaded' });
        });
        this.video.addEventListener('play', function () {
            self.showControls(true);
            self._emit('statechange', { state: 'playing' });
        });
        this.video.addEventListener('pause', function () {
            self.showControls(true);
            self._emit('statechange', { state: 'paused' });
        });
        this.video.addEventListener('ended', function () {
            self._emit('ended', { video: self.currentVideo });
        });
        this.video.addEventListener('error', function (event) {
            Logger.error('Video error', event);
            self._emit('statechange', { state: 'error', error: event });
        });
    };

    PlayerController.prototype.getLiveState = function () {
        return {
            isLive: this.isLive,
            isAtLiveEdge: this.shakaController && typeof this.shakaController.isAtLiveEdge === 'function'
                ? this.shakaController.isAtLiveEdge()
                : !this.isLive || Math.abs((this.video.duration || 0) - (this.video.currentTime || 0)) < 2
        };
    };

    PlayerController.prototype._emit = function (eventName, payload) {
        const handlers = this.listeners[eventName] || [];
        for (let i = 0; i < handlers.length; i += 1) {
            try {
                handlers[i](payload);
            } catch (error) {
                Logger.warn('Player listener error', eventName, error);
            }
        }
    };

    PlayerController.prototype.on = function (eventName, handler) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(handler);
    };

    PlayerController.prototype.loadVideo = function (video, options) {
        if (!this.video || !video) {
            return;
        }
        this.currentVideo = video;
        this.isLive = !!video.isLive;
        this.pendingResumeTime = options && options.resumeSeconds ? options.resumeSeconds : null;
        this.currentQuality = options && options.quality ? options.quality : CONFIG.video.defaultQuality;

        const manifestUrl = video.manifestUrl || video.streamUrl || this._getHlsSource(video);
        const self = this;

        if (this.shakaController && manifestUrl) {
            const liveOptions = {
                isLive: video.isLive,
                startTime: this.pendingResumeTime,
                bufferBehind: video.dvrWindow || 60,
                presentationDelay: 8
            };

            this.shakaController.load(manifestUrl, liveOptions).then(function () {
                self._emit('statechange', { state: 'loaded', engine: 'shaka' });
            }).catch(function (error) {
                Logger.error('Shaka load failed, falling back', error);
                self._fallbackLoad(video, manifestUrl);
            });
        } else {
            this._fallbackLoad(video, manifestUrl);
        }

        this._updateJumpToLiveButton();
    };

    PlayerController.prototype._fallbackLoad = function (video, manifestUrl) {
        const selectedSource = this._resolveSource(video, this.currentQuality);
        this.currentSource = selectedSource;

        try {
            this.video.pause();
            this.video.removeAttribute('src');
            this.video.load();
        } catch (error) {
            Logger.warn('Video cleanup failed', error);
        }

        if (selectedSource && selectedSource.url) {
            this.video.src = selectedSource.url;
        } else if (manifestUrl) {
            this.video.src = manifestUrl;
        } else {
            Logger.warn('No source found for video', video);
        }

        try {
            this.video.load();
            const playPromise = this.video.play();
            if (playPromise && typeof playPromise.then === 'function') {
                playPromise.catch(function (error) {
                    Logger.warn('Autoplay blocked', error);
                });
            }
        } catch (error) {
            Logger.warn('Video play failed', error);
        }
    };

    PlayerController.prototype._getHlsSource = function (video) {
        if (!video || !video.sources) {
            return null;
        }
        for (let i = 0; i < video.sources.length; i += 1) {
            const source = video.sources[i];
            if (source.type === 'application/x-mpegURL' || (source.url && source.url.indexOf('.m3u8') !== -1)) {
                return source.url;
            }
        }
        return null;
    };

    PlayerController.prototype._resolveSource = function (video, quality) {
        if (!video || !video.sources || !video.sources.length) {
            return null;
        }
        let selected = null;
        for (let i = 0; i < video.sources.length; i += 1) {
            if (video.sources[i].quality === quality) {
                selected = video.sources[i];
                break;
            }
        }
        if (!selected) {
            selected = video.sources[0];
        }
        return selected;
    };

    PlayerController.prototype.togglePlay = function () {
        if (!this.video) {
            return;
        }
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    };

    PlayerController.prototype.seek = function (deltaSeconds) {
        if (!this.video || this.isLive) {
            return;
        }
        const target = clamp(
            (this.video.currentTime || 0) + deltaSeconds,
            0,
            this.video.duration || 0
        );
        try {
            this.video.currentTime = target;
        } catch (error) {
            Logger.warn('Seek failed', error);
        }
        this.showControls(true);
    };

    PlayerController.prototype.setQuality = function (quality) {
        if (!this.currentVideo) {
            return;
        }
        this.currentQuality = quality;

        if (this.shakaController) {
            if (quality === 'auto') {
                this.shakaController.selectTrackByHeight('auto');
            } else {
                const numeric = parseInt(quality, 10);
                if (!isNaN(numeric)) {
                    this.shakaController.selectTrackByHeight(numeric);
                }
            }
            return;
        }

        const currentTime = this.video ? this.video.currentTime || 0 : 0;
        this.loadVideo(this.currentVideo, {
            quality: quality,
            resumeSeconds: this.isLive ? null : currentTime
        });
    };

    PlayerController.prototype.showControls = function (keepVisible) {
        if (!this.container) {
            return;
        }
        this.container.classList.add('show-controls');
        if (this.controlsTimer) {
            clearTimeout(this.controlsTimer);
        }
        if (!keepVisible) {
            return;
        }
        const self = this;
        this.controlsTimer = setTimeout(function () {
            self.hideControls();
        }, CONFIG.ui.controlsHideDelay);
    };

    PlayerController.prototype.hideControls = function () {
        if (!this.container) {
            return;
        }
        this.container.classList.remove('show-controls');
    };

    PlayerController.prototype.stop = function () {
        if (!this.video) {
            return;
        }
        try {
            this.video.pause();
            this.video.removeAttribute('src');
            this.video.load();
        } catch (error) {
            Logger.warn('Player stop failed', error);
        }
        this.currentVideo = null;
        this.currentSource = null;
        this.pendingResumeTime = null;
        this.hideControls();

        if (this.shakaController) {
            this.shakaController.destroy();
            this.shakaController = new App.ShakaController(this.video);
        }

        this._updateJumpToLiveButton();
    };

    PlayerController.prototype.getState = function () {
        return {
            video: this.currentVideo,
            quality: this.currentQuality,
            isLive: this.isLive
        };
    };

    /**
     * UI helpers for manipulating DOM.
     */
    const UI = (function () {
        const TOAST_DURATION = 3500;
        let toastTimer = null;
        const state = {
            dom: {}
        };

        function cacheDom(elements) {
            state.dom = elements;
        }

        function setStatusUser(name) {
            if (state.dom.statusUser) {
                state.dom.statusUser.textContent = name || 'Not signed in';
            }
        }

        function setStatusNetwork(isOnline, usingSample) {
            if (!state.dom.statusNetwork) {
                return;
            }
            if (usingSample) {
                state.dom.statusNetwork.textContent = 'Offline Mode';
                state.dom.statusNetwork.classList.remove('status-online');
                state.dom.statusNetwork.classList.add('status-offline');
                return;
            }
            if (isOnline) {
                state.dom.statusNetwork.textContent = 'Online';
                state.dom.statusNetwork.classList.add('status-online');
                state.dom.statusNetwork.classList.remove('status-offline');
            } else {
                state.dom.statusNetwork.textContent = 'Offline';
                state.dom.statusNetwork.classList.remove('status-online');
                state.dom.statusNetwork.classList.add('status-offline');
            }
        }

        function showToast(message, duration) {
            if (!state.dom.toast) {
                return;
            }
            if (toastTimer) {
                clearTimeout(toastTimer);
            }
            state.dom.toast.textContent = message;
            state.dom.toast.classList.add('is-visible');
            toastTimer = setTimeout(function () {
                hideToast();
            }, duration || TOAST_DURATION);
        }

        function hideToast() {
            if (!state.dom.toast) {
                return;
            }
            state.dom.toast.classList.remove('is-visible');
        }

        function showLoader(message) {
            if (state.dom.loader) {
                state.dom.loader.classList.remove('hidden');
                if (message) {
                    state.dom.loader.textContent = message;
                }
            }
        }

        function hideLoader() {
            if (state.dom.loader) {
                state.dom.loader.classList.add('hidden');
                state.dom.loader.textContent = '';
            }
        }

        function renderCreators(list, activeCreatorId) {
            if (!state.dom.creatorList) {
                return;
            }
            state.dom.creatorList.innerHTML = '';
            for (let i = 0; i < list.length; i += 1) {
                const creator = list[i];
                const card = document.createElement('div');
                card.className = 'creator-card';
                card.setAttribute('role', 'button');
                card.setAttribute('data-focusable', 'true');
                card.setAttribute('data-focus-group', 'creators');
                card.setAttribute('data-creator-id', creator.id);

                const avatar = document.createElement('div');
                avatar.className = 'creator-card__avatar';
                avatar.textContent = creator.slug ? creator.slug.toUpperCase() : creator.name.charAt(0);

                const info = document.createElement('div');
                info.className = 'creator-card__info';

                const name = document.createElement('div');
                name.className = 'creator-card__name';
                name.textContent = creator.name;

                const meta = document.createElement('div');
                meta.className = 'creator-card__meta';
                meta.textContent = (creator.newPosts || 0) + ' new videos';

                info.appendChild(name);
                info.appendChild(meta);
                card.appendChild(avatar);
                card.appendChild(info);

                if (activeCreatorId && activeCreatorId === creator.id) {
                    card.classList.add('is-selected');
                }

                state.dom.creatorList.appendChild(card);
            }
            FocusManager.refreshGroup('creators');
        }

        function renderVideos(list, activeVideoIndex) {
            if (!state.dom.videoGrid) {
                return;
            }
            state.dom.videoGrid.innerHTML = '';
            for (let i = 0; i < list.length; i += 1) {
                const video = list[i];
                const card = document.createElement('div');
                card.className = 'video-card';
                card.setAttribute('role', 'button');
                card.setAttribute('data-focusable', 'true');
                card.setAttribute('data-focus-group', 'videos');
                card.setAttribute('data-video-index', String(i));
                card.setAttribute('data-video-id', video.id);

                const thumb = document.createElement('div');
                thumb.className = 'video-card__thumb';
                thumb.textContent = video.isLive ? 'Live Stream' : 'Video Preview';

                const title = document.createElement('div');
                title.className = 'video-card__title';
                title.textContent = video.title;

                const meta = document.createElement('div');
                meta.className = 'video-card__meta';
                meta.innerHTML = '<span>' + formatDuration(video.duration) + '</span>'
                    + '<span>' + formatPublishDate(video.publishedAt) + '</span>';

                card.appendChild(thumb);
                card.appendChild(title);
                card.appendChild(meta);

                if (video.isLive) {
                    const badge = document.createElement('span');
                    badge.className = 'badge badge-live';
                    badge.textContent = 'Live';
                    card.appendChild(badge);
                }

                state.dom.videoGrid.appendChild(card);
            }
            FocusManager.refreshGroup('videos');
            if (activeVideoIndex !== -1) {
                FocusManager.setFocus('videos', activeVideoIndex);
            }
        }

        function updateVideoDetails(video, progress) {
            if (!state.dom.videoTitle) {
                return;
            }
            if (!video) {
                state.dom.videoTitle.textContent = 'Focus a video for details';
                state.dom.videoDescription.textContent = 'Use the arrow keys to browse videos. Press OK to play.';
                state.dom.videoDuration.textContent = 'Duration —';
                state.dom.videoPublished.textContent = 'Published —';
                if (state.dom.videoLiveBadge) {
                    state.dom.videoLiveBadge.classList.add('hidden');
                }
                if (state.dom.playButton) {
                    state.dom.playButton.disabled = true;
                }
                if (state.dom.resumeButton) {
                    state.dom.resumeButton.disabled = true;
                    state.dom.resumeButton.textContent = 'Resume';
                }
                return;
            }
            state.dom.videoTitle.textContent = video.title;
            state.dom.videoDescription.textContent = video.description || 'No description available.';
            state.dom.videoDuration.textContent = 'Duration ' + formatDuration(video.duration);
            state.dom.videoPublished.textContent = 'Published ' + formatPublishDate(video.publishedAt);

            if (state.dom.videoLiveBadge) {
                if (video.isLive) {
                    state.dom.videoLiveBadge.classList.remove('hidden');
                } else {
                    state.dom.videoLiveBadge.classList.add('hidden');
                }
            }

            if (state.dom.resumeButton) {
                if (progress && progress.position && progress.duration
                    && progress.position < progress.duration - CONFIG.video.resumeThreshold) {
                    state.dom.resumeButton.disabled = false;
                    state.dom.resumeButton.textContent = 'Resume (' + secondsToClock(progress.position) + ')';
                } else {
                    state.dom.resumeButton.disabled = true;
                    state.dom.resumeButton.textContent = 'Resume';
                }
            }

            if (state.dom.playButton) {
                state.dom.playButton.disabled = false;
            }
        }

        function renderQualityMenu(sources, activeQuality) {
            if (!state.dom.qualityMenu) {
                return;
            }
            state.dom.qualityMenu.innerHTML = '';
            if (!sources || !sources.length) {
                return;
            }
            for (let i = 0; i < sources.length; i += 1) {
                const source = sources[i];
                const button = document.createElement('button');
                button.setAttribute('type', 'button');
                button.setAttribute('data-focusable', 'true');
                button.setAttribute('data-focus-group', 'quality');
                button.setAttribute('data-action', 'set-quality');
                button.setAttribute('data-quality', source.quality);
                button.textContent = source.quality.toUpperCase();
                if (source.quality === activeQuality) {
                    button.classList.add('active');
                }
                state.dom.qualityMenu.appendChild(button);
            }
            FocusManager.refreshGroup('quality');
        }

        function updatePlayerOverlay(data) {
            if (!state.dom.playerTitle) {
                return;
            }
            state.dom.playerTitle.textContent = data.title || 'Now Playing';
            if (state.dom.playerSubtitle) {
                state.dom.playerSubtitle.textContent = data.creatorName || '';
            }
            if (state.dom.playerTimecode) {
                state.dom.playerTimecode.textContent = formatTimecode(data.current, data.duration, data.isLive);
            }
            if (state.dom.playerLiveIndicator) {
                if (data.isLive) {
                    state.dom.playerLiveIndicator.classList.remove('hidden');
                } else {
                    state.dom.playerLiveIndicator.classList.add('hidden');
                }
            }
        }

        function updateQualityButton(quality) {
            if (state.dom.playerQualityButton) {
                state.dom.playerQualityButton.textContent = 'Quality: ' + quality.toUpperCase();
            }
        }

        return {
            cacheDom: cacheDom,
            setStatusUser: setStatusUser,
            setStatusNetwork: setStatusNetwork,
            showToast: showToast,
            hideToast: hideToast,
            showLoader: showLoader,
            hideLoader: hideLoader,
            renderCreators: renderCreators,
            renderVideos: renderVideos,
            updateVideoDetails: updateVideoDetails,
            renderQualityMenu: renderQualityMenu,
            updatePlayerOverlay: updatePlayerOverlay,
            updateQualityButton: updateQualityButton
        };
    }());

    /**
     * Main application controller.
     */
    const AppController = (function () {
        const state = {
            networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
            useSampleData: StorageService.get(CONFIG.storage.sampleModeKey, false),
            creators: [],
            videos: [],
            selectedCreatorIndex: 0,
            selectedVideoIndex: -1,
            currentUser: null,
            qualityMenuOpen: false,
            chatEnabled: false,
            chatVisible: false,
            chatConnected: false,
            viewingMode: 'theater',
            loadingCreators: false,
            loadingVideos: false,
            lastLoginIndex: 0
        };

        const dom = {};
        const authService = new App.AuthService({
            baseUrl: CONFIG.api.baseUrl,
            userAgent: CONFIG.app.userAgent,
            sessionKey: CONFIG.storage.sessionKey,
            csrfKey: 'fp_csrf',
            timeout: CONFIG.api.timeout
        });
        const TURNSTILE_SITE_KEY = '0x4AAAAAAAddaGqET5kel-Pq';
        const TURNSTILE_EXECUTION_COOLDOWN = 2000;
        let turnstileWidgetId = null;
        let turnstileToken = null;
        let pendingTurnstileCallback = null;
        let turnstileExecuting = false;
        let pendingLoginRequest = null;
        let lastTurnstileExecution = 0;
        let turnstileDisabled = true;
        let turnstileAvailable = false;
        let turnstileFatal = false;
        // Expose authService globally for testing
        App._authService = authService;
        const floatplaneClient = authService.getClient ? authService.getClient() : authService;
        const contentService = new App.ContentService({ client: floatplaneClient });
        let playerController = null;
        let chatService = null;
        let viewingModeManager = null;

        function cacheDom() {
            dom.statusUser = document.getElementById('statusUser');
            dom.statusNetwork = document.getElementById('statusNetwork');
            dom.toast = document.getElementById('toast');
            dom.loader = document.getElementById('globalLoader');
            dom.loginForm = document.getElementById('loginForm');
            dom.loginEmail = document.getElementById('loginEmail');
            dom.loginPassword = document.getElementById('loginPassword');
            dom.twoFactorField = document.getElementById('twoFactorField');
            dom.twoFactorInput = document.getElementById('loginTwoFactor');
            dom.turnstileContainer = document.getElementById('turnstileWidget');
            dom.loginSubmitButton = document.querySelector('button[data-action="login-submit"]');
            dom.useSampleButton = document.getElementById('useSampleData');
            dom.creatorList = document.getElementById('creatorList');
            dom.homeCreatorName = document.getElementById('homeCreatorName');
            dom.homeCreatorDescription = document.getElementById('homeCreatorDescription');
            dom.videoGrid = document.getElementById('videoGrid');
            dom.videoTitle = document.getElementById('videoTitle');
            dom.videoDescription = document.getElementById('videoDescription');
            dom.videoDuration = document.getElementById('videoDuration');
            dom.videoPublished = document.getElementById('videoPublished');
            dom.videoLiveBadge = document.getElementById('videoLiveBadge');
            dom.playButton = document.getElementById('playButton');
            dom.resumeButton = document.getElementById('resumeButton');
            dom.refreshButton = document.getElementById('refreshButton');
            dom.logoutButton = document.getElementById('logoutButton');
            dom.videoElement = document.getElementById('videoElement');
            dom.playerContainer = document.getElementById('playerContainer');
            dom.playerTitle = document.getElementById('playerVideoTitle');
            dom.playerSubtitle = document.getElementById('playerCreatorName');
            dom.playerTimecode = document.getElementById('playerTimecode');
            dom.playerLiveIndicator = document.getElementById('playerLiveIndicator');
            dom.playerQualityButton = document.getElementById('playerQualityButton');
            dom.qualityMenu = document.getElementById('qualityMenu');
            dom.playerPlayPause = document.getElementById('playerPlayPause');
            dom.playerSeekForward = document.getElementById('playerSeekForward');
            dom.playerSeekBackward = document.getElementById('playerSeekBackward');
            dom.playerExitButton = document.getElementById('playerExitButton');
            dom.playerJumpToLive = document.getElementById('playerJumpToLive');
            dom.playerChatToggle = document.getElementById('playerChatToggle');
            dom.playerModeToggle = document.getElementById('playerModeToggle');
            dom.chatPanel = document.getElementById('chatPanel');
            dom.chatMessages = document.getElementById('chatMessages');
            dom.chatMessageInput = document.getElementById('chatMessageInput');
            dom.chatSendButton = document.getElementById('chatSendButton');
            dom.chatViewerCount = document.getElementById('chatViewerCount');
            dom.viewingModeIndicator = document.getElementById('viewingModeIndicator');
            dom.playerSidebar = document.getElementById('playerSidebar');
            dom.chatInputArea = document.getElementById('chatInputArea');

            UI.cacheDom(dom);
        }

        function initFocus() {
            FocusManager.registerGroup('login', { type: 'column' });
            FocusManager.registerGroup('login-buttons', { type: 'row' });
            FocusManager.registerGroup('creators', { type: 'list' });
            FocusManager.registerGroup('videos', { type: 'grid', columns: 4 });
            FocusManager.registerGroup('home-actions', { type: 'row' });
            FocusManager.registerGroup('content-actions', { type: 'row' });
            FocusManager.registerGroup('player-controls', { type: 'row' });
            FocusManager.registerGroup('quality', { type: 'list' });
            FocusManager.registerGroup('chat-controls', { type: 'row' });
            FocusManager.registerGroup('chat-input', { type: 'row' });

            FocusManager.onChange(function (info) {
                handleFocusChange(info);
            });
        }

        function bindEvents() {
            document.addEventListener('keydown', handleKeyDown, false);
            document.addEventListener('focusin', function (event) {
                const target = event.target;
                VirtualKeyboard.update(target);

                if (!target || target.getAttribute('data-focusable') !== 'true') {
                    return;
                }

                const groupName = target.getAttribute('data-focus-group');
                if (!groupName) {
                    return;
                }

                FocusManager.refreshGroup(groupName);
                const index = parseInt(target.getAttribute('data-focus-index'), 10);
                if (!isNaN(index)) {
                    FocusManager.setFocus(groupName, index);
                }
            });

            if (dom.loginForm) {
                dom.loginForm.addEventListener('submit', function (event) {
                    event.preventDefault();
                    submitLogin();
                });
            }
            if (dom.twoFactorInput) {
                dom.twoFactorInput.addEventListener('focus', function () {
                    VirtualKeyboard.update(dom.twoFactorInput);
                });
                VirtualKeyboard.register(dom.twoFactorInput);
            }
            if (dom.useSampleButton) {
                dom.useSampleButton.addEventListener('click', function () {
                    enableSampleMode();
                });
            }
            if (dom.logoutButton) {
                dom.logoutButton.addEventListener('click', function () {
                    logout();
                });
            }
            if (dom.refreshButton) {
                dom.refreshButton.addEventListener('click', function () {
                    refreshCreators();
                });
            }
            if (dom.playButton) {
                dom.playButton.addEventListener('click', function () {
                    playSelected(false);
                });
            }
            if (dom.resumeButton) {
                dom.resumeButton.addEventListener('click', function () {
                    playSelected(true);
                });
            }
            if (dom.videoGrid) {
                dom.videoGrid.addEventListener('click', function (event) {
                    const card = event.target.closest('.video-card');
                    if (card) {
                        const index = parseInt(card.getAttribute('data-video-index'), 10);
                        if (!isNaN(index)) {
                            handleVideoSelection(index);
                        }
                    }
                });
            }
            if (dom.playerQualityButton) {
                dom.playerQualityButton.addEventListener('click', function () {
                    toggleQualityMenu(true);
                });
            }
            if (dom.qualityMenu) {
                dom.qualityMenu.addEventListener('click', function (event) {
                    const button = event.target.closest('button[data-quality]');
                    if (button) {
                        setPlayerQuality(button.getAttribute('data-quality'));
                    }
                });
            }
            if (dom.playerPlayPause) {
                dom.playerPlayPause.addEventListener('click', function () {
                    if (playerController) {
                        playerController.togglePlay();
                    }
                });
            }
            if (dom.playerSeekForward) {
                dom.playerSeekForward.addEventListener('click', function () {
                    if (playerController) {
                        playerController.seek(CONFIG.video.seekIncrement);
                    }
                });
            }
            if (dom.playerSeekBackward) {
                dom.playerSeekBackward.addEventListener('click', function () {
                    if (playerController) {
                        playerController.seek(-CONFIG.video.seekIncrement);
                    }
                });
            }
            if (dom.playerExitButton) {
                dom.playerExitButton.addEventListener('click', function () {
                    exitPlayer();
                });
            }
            if (dom.playerJumpToLive) {
                dom.playerJumpToLive.addEventListener('click', function () {
                    if (playerController && typeof playerController.seekToLive === 'function') {
                        playerController.seekToLive();
                    }
                });
            }
            if (dom.playerChatToggle) {
                dom.playerChatToggle.addEventListener('click', function () {
                    toggleChatPanel();
                });
            }
            if (dom.playerModeToggle) {
                dom.playerModeToggle.addEventListener('click', function () {
                    toggleViewingMode();
                });
            }
            if (dom.chatSendButton) {
                dom.chatSendButton.addEventListener('click', function () {
                    submitChatMessage();
                });
            }
            if (dom.chatMessageInput) {
                dom.chatMessageInput.addEventListener('keydown', function (event) {
                    if (event.key === 'Enter' || event.keyCode === 13) {
                        event.preventDefault();
                        submitChatMessage();
                    }
                });
                dom.chatMessageInput.addEventListener('focus', function () {
                    VirtualKeyboard.update(dom.chatMessageInput);
                });
                VirtualKeyboard.register(dom.chatMessageInput);
            }
            if (typeof window !== 'undefined') {
                window.addEventListener('online', function () {
                    state.networkOnline = true;
                    UI.setStatusNetwork(true, state.useSampleData);
                });
                window.addEventListener('offline', function () {
                    state.networkOnline = false;
                    UI.setStatusNetwork(false, state.useSampleData);
                });
            }
        }

        function handleFocusChange(info) {
            const currentElement = info.element;
            if (!currentElement) {
                return;
            }

            if (currentElement.closest('[data-screen]')) {
                ScreenManager.show(currentElement.getAttribute('data-screen'));
                return;
            }

            if (currentElement.closest('[data-focus-group="login"]')) {
                const index = parseInt(currentElement.getAttribute('data-focus-index'), 10) || 0;
                state.lastLoginIndex = index;
                const stateSnapshot = FocusManager.getState ? FocusManager.getState() : null;
                if (!stateSnapshot || stateSnapshot.group !== 'login' || stateSnapshot.index !== index) {
                    FocusManager.setFocus('login', index);
                }
                return;
            }

            if (currentElement.closest('[data-focus-group="creators"]')) {
                if (dom.creatorList) {
                    dom.creatorList.focus();
                }
                return;
            }

            if (currentElement.closest('[data-focus-group="videos"]')) {
                if (dom.videoGrid) {
                    dom.videoGrid.focus();
                }
                return;
            }

            if (currentElement.closest('[data-focus-group="home-actions"]')) {
                if (dom.useSampleButton) {
                    dom.useSampleButton.focus();
                }
                return;
            }

            if (currentElement.closest('[data-focus-group="content-actions"]')) {
                if (dom.refreshButton) {
                    dom.refreshButton.focus();
                }
                return;
            }

            if (currentElement.closest('[data-focus-group="player-controls"]')) {
                if (dom.playerPlayPause) {
                    dom.playerPlayPause.focus();
                }
                return;
            }

            if (currentElement.closest('[data-focus-group="quality"]')) {
                if (dom.qualityMenu) {
                    dom.qualityMenu.focus();
                }
                return;
            }

            if (currentElement.closest('[data-focus-group="chat-controls"]')) {
                if (dom.chatSendButton) {
                    dom.chatSendButton.focus();
                }
                return;
            }

            if (currentElement.closest('[data-focus-group="chat-input"]')) {
                if (dom.chatMessageInput) {
                    dom.chatMessageInput.focus();
                }
                return;
            }
        }

        function handleKeyDown(event) {
            const currentElement = document.activeElement;

            if (!currentElement) {
                return;
            }

            const focusGroup = currentElement.getAttribute('data-focus-group');
            if (focusGroup) {
                let indexAttr = currentElement.getAttribute('data-focus-index');
                if (indexAttr === null) {
                    FocusManager.refreshGroup(focusGroup);
                    indexAttr = currentElement.getAttribute('data-focus-index');
                }
                const resolvedIndex = parseInt(indexAttr, 10);
                const state = typeof FocusManager.getState === 'function' ? FocusManager.getState() : null;
                if (!state || state.group !== focusGroup || state.element !== currentElement) {
                    FocusManager.setFocus(focusGroup, isNaN(resolvedIndex) ? 0 : resolvedIndex);
                }
            }

            // Skip navigation for text inputs (keyboard should handle this)
            const isTextInput = currentElement.tagName === 'INPUT' || currentElement.tagName === 'TEXTAREA';
            if (isTextInput) {
                const navigationKeys = [
                    KEY_CODES.UP,
                    KEY_CODES.DOWN,
                    KEY_CODES.LEFT,
                    KEY_CODES.RIGHT,
                    KEY_CODES.ENTER,
                    KEY_CODES.SPACE,
                    KEY_CODES.BACK,
                    KEY_CODES.ESC
                ];
                if (navigationKeys.indexOf(event.keyCode) === -1) {
                    return;
                }
            }

            // Global arrow key navigation
            if (event.keyCode === KEY_CODES.UP) {
                event.preventDefault();
                const focusState = FocusManager.getState ? FocusManager.getState() : null;
                if (focusState && focusState.group === 'login-buttons') {
                    const inputs = document.querySelectorAll('[data-focus-group="login"][data-focusable="true"]');
                    const fallbackIndex = inputs.length ? Math.max(Math.min(state.lastLoginIndex, inputs.length - 1), 0) : 0;
                    FocusManager.refreshGroup('login');
                    FocusManager.setFocus('login', fallbackIndex);
                } else {
                    FocusManager.move('up');
                }
                return;
            }
            if (event.keyCode === KEY_CODES.DOWN) {
                event.preventDefault();
                const state = FocusManager.getState();
                if (state.group === 'login') {
                    const success = FocusManager.move('down');
                    if (!success) {
                        FocusManager.refreshGroup('login-buttons');
                        FocusManager.setFocus('login-buttons', 0);
                    }
                } else if (state.group === 'login-buttons') {
                    // Stay on login buttons; do nothing on DOWN.
                } else {
                    FocusManager.move('down');
                }
                return;
            }
            if (event.keyCode === KEY_CODES.LEFT) {
                event.preventDefault();
                const focusState = FocusManager.getState ? FocusManager.getState() : null;
                if (focusState && focusState.group === 'login-buttons') {
                    const beforeIndex = focusState.index || 0;
                    const moved = FocusManager.move('left');
                    if (!moved || beforeIndex === 0) {
                        const inputs = document.querySelectorAll('[data-focus-group="login"][data-focusable="true"]');
                        const fallbackIndex = inputs.length ? Math.max(Math.min(state.lastLoginIndex, inputs.length - 1), 0) : 0;
                        FocusManager.refreshGroup('login');
                        FocusManager.setFocus('login', fallbackIndex);
                    }
                    return;
                }
                if (!FocusManager.move('left')) {
                    if (currentElement.closest('[data-focus-group="player-controls"]') && playerController) {
                        playerController.seek(-CONFIG.video.seekIncrement);
                    }
                }
                return;
            }
            if (event.keyCode === KEY_CODES.RIGHT) {
                event.preventDefault();
                const state = FocusManager.getState ? FocusManager.getState() : null;
                if (state && state.group === 'login') {
                    const success = FocusManager.move('right');
                    if (!success) {
                        FocusManager.refreshGroup('login-buttons');
                        FocusManager.setFocus('login-buttons', 0);
                    }
                } else if (state && state.group === 'login-buttons') {
                    FocusManager.move('right');
                } else if (!FocusManager.move('right')) {
                    if (currentElement.closest('[data-focus-group="player-controls"]') && playerController) {
                        playerController.seek(CONFIG.video.seekIncrement);
                    }
                }
                return;
            }

            // Group-specific ENTER key handling
        if (event.keyCode === KEY_CODES.ENTER || event.keyCode === KEY_CODES.SPACE) {
                if (currentElement.closest('[data-focus-group="login"]')) {
                    event.preventDefault();
                    if (typeof currentElement.click === 'function') {
                        currentElement.click();
                    }
                    if (typeof currentElement.focus === 'function') {
                        currentElement.focus();
                    }
                    VirtualKeyboard.update(currentElement);
                    return;
                }
                if (currentElement.closest('[data-focus-group="home-actions"]')) {
                    event.preventDefault();
                    enableSampleMode();
                    return;
                }
                if (currentElement.closest('[data-focus-group="content-actions"]')) {
                    event.preventDefault();
                    refreshCreators();
                    return;
                }
                if (currentElement.closest('[data-focus-group="player-controls"]')) {
                    event.preventDefault();
                    if (playerController) {
                        playerController.togglePlay();
                    }
                    return;
                }
                // Let default behavior handle button clicks for other groups
                return;
            }

            // Play/Pause media key
            if (event.keyCode === KEY_CODES.PLAY_PAUSE) {
                if (currentElement.closest('[data-focus-group="player-controls"]') && playerController) {
                    event.preventDefault();
                    playerController.togglePlay();
                }
                return;
            }

            // BACK key handling
            if (event.keyCode === KEY_CODES.BACK || event.keyCode === KEY_CODES.ESC) {
                event.preventDefault();

                if (currentElement.closest('[data-focus-group="quality"]')) {
                    if (playerController) {
                        playerController.showControls(true);
                    }
                    return;
                }
                if (currentElement.closest('[data-focus-group="chat-controls"]') || currentElement.closest('[data-focus-group="chat-input"]')) {
                    if (playerController) {
                        playerController.showControls(true);
                    }
                    return;
                }
                if (currentElement.closest('[data-focus-group="player-controls"]')) {
                    exitPlayer();
                    return;
                }
                if (currentElement.closest('[data-focus-group="creators"]') || currentElement.closest('[data-focus-group="videos"]')) {
                    ScreenManager.show('home');
                    FocusManager.setFocus('home-actions', 0);
                    return;
                }
                if (currentElement.closest('[data-focus-group="login"]')) {
                    return;
                }
            }
        }

        function submitLogin() {
            if (!dom.loginForm || !dom.loginEmail || !dom.loginPassword) {
                return;
            }
            const username = dom.loginEmail.value.trim();
            const password = dom.loginPassword.value.trim();
            if (!username || !password) {
                UI.showToast('Please enter username and password.');
                return;
            }
            function continueLogin(token) {
                const effectiveToken = turnstileDisabled ? undefined : (token || undefined);
                UI.showLoader();
                if (dom.loginSubmitButton) {
                    dom.loginSubmitButton.disabled = true;
                }
                authService.login(username, password, null, effectiveToken).then(function (data) {
                    UI.hideLoader();
                    if (dom.loginSubmitButton) {
                        dom.loginSubmitButton.disabled = false;
                    }
                    if (data.requiresTwoFactor) {
                        if (dom.twoFactorField) {
                            dom.twoFactorField.classList.remove('hidden');
                            dom.twoFactorInput.focus();
                        }
                    } else {
                        state.currentUser = data.user;
                        UI.setStatusUser(state.currentUser.displayName || state.currentUser.email || 'Signed In');
                        ScreenManager.show('home');
                        FocusManager.setFocus('creators', 0);
                    }
                }).catch(function (error) {
                    UI.hideLoader();
                    if (dom.loginSubmitButton) {
                        dom.loginSubmitButton.disabled = false;
                    }
                    Logger.error('Login failed', error);
                    UI.showToast(error.message || 'Login failed. Please try again.');
                    if (window.turnstile && typeof window.turnstile.reset === 'function' && turnstileWidgetId) {
                        window.turnstile.reset(turnstileWidgetId);
                        turnstileToken = null;
                        turnstileExecuting = false;
                    }
                    pendingTurnstileCallback = null;
                    pendingLoginRequest = null;
                });
            }

            if (turnstileFatal) {
                continueLogin(undefined);
                return;
            }

            if (turnstileDisabled) {
                UI.showToast('Captcha is preparing. Please wait a moment and try again.');
                pendingLoginRequest = submitLogin;
                return;
            }

            if (!window.turnstile || !turnstileWidgetId) {
                UI.showToast('Captcha is preparing. Please wait a moment and try again.');
                pendingLoginRequest = submitLogin;
                return;
            }

            if (turnstileToken) {
                continueLogin(turnstileToken);
                return;
            }

            if (typeof window.turnstile.execute === 'function') {
                if (turnstileExecuting) {
                    pendingLoginRequest = submitLogin;
                    return;
                }
                pendingTurnstileCallback = function (token) {
                    if (token) {
                        continueLogin(token);
                    } else {
                        UI.showToast('Captcha verification failed. Please try again.');
                        pendingLoginRequest = null;
                        if (window.turnstile && typeof window.turnstile.reset === 'function' && turnstileWidgetId) {
                            window.turnstile.reset(turnstileWidgetId);
                        }
                    }
                    turnstileExecuting = false;
                };
                turnstileExecuting = true;
                var now = Date.now();
                var sinceLast = now - lastTurnstileExecution;
                var executeTurnstile = function () {
                    lastTurnstileExecution = Date.now();
                    window.turnstile.execute(turnstileWidgetId, { action: 'login' }).catch(function () {
                        turnstileExecuting = false;
                        pendingTurnstileCallback = null;
                        pendingLoginRequest = null;
                        UI.showToast('Captcha verification failed. Please try again.');
                        if (window.turnstile && typeof window.turnstile.reset === 'function' && turnstileWidgetId) {
                            window.turnstile.reset(turnstileWidgetId);
                        }
                    });
                };
                if (sinceLast < TURNSTILE_EXECUTION_COOLDOWN) {
                    setTimeout(executeTurnstile, TURNSTILE_EXECUTION_COOLDOWN - sinceLast);
                } else {
                    executeTurnstile();
                }
                return;
            }

            UI.showToast('Captcha is unavailable. Please try again shortly.');
            pendingLoginRequest = submitLogin;
            return;
        }

        function enableSampleMode(silent) {
            if (state.useSampleData) {
                if (!silent) {
                    UI.showToast('Sample mode is already enabled.');
                }
                return;
            }
            state.useSampleData = true;
            StorageService.set(CONFIG.storage.sampleModeKey, true);
            if (!silent) {
                UI.showToast('Sample mode enabled. Offline content will be used.');
            }
            authService.logout();
            state.currentUser = null;
            UI.setStatusUser('Signed Out');
            ScreenManager.show('login');
            FocusManager.setFocus('login', 0);
            clearContent();
        }

        function logout() {
            authService.logout();
            state.currentUser = null;
            UI.setStatusUser('Signed Out');
            ScreenManager.show('login');
            FocusManager.setFocus('login', 0);
            UI.showToast('Logged out successfully.');
            clearContent();
        }

        function clearContent() {
            state.creators = [];
            state.videos = [];
            state.selectedCreatorIndex = 0;
            state.selectedVideoIndex = -1;
            state.currentCreator = null;
            state.currentVideo = null;
            UI.renderCreators([], -1);
            UI.renderVideos([], -1);
            UI.updateVideoDetails(null);
            if (chatService) {
                chatService.disconnect();
            }
        }

        function refreshCreators() {
            if (state.useSampleData) {
                applySampleCreators();
                return;
            }
            if (!floatplaneClient || !floatplaneClient.isAuthenticated || !floatplaneClient.isAuthenticated()) {
                Logger.warn('Cannot refresh creators while unauthenticated');
                return;
            }
            if (state.loadingCreators) {
                return;
            }
            state.loadingCreators = true;
            UI.showLoader('Syncing subscriptions…');
            contentService.getUserSubscriptions({ includeLivestream: true }).then(function (data) {
                UI.hideLoader();
                state.loadingCreators = false;
                var creators = (data && data.subscriptions) || data || [];
                state.creators = creators;
                state.selectedCreatorIndex = creators.length ? 0 : -1;
                UI.renderCreators(creators, state.selectedCreatorIndex);
                if (creators.length) {
                    selectCreator(creators[0], 0);
                } else {
                    UI.showToast('No subscriptions found. Subscribe to creators on Floatplane.');
                }
            }).catch(function (error) {
                UI.hideLoader();
                state.loadingCreators = false;
                Logger.warn('Failed to load subscriptions', error);
                UI.showToast('Unable to load subscriptions. Check connection or try again.');
            });
        }

        function applySampleCreators() {
            state.creators = SAMPLE_DATA.creators.slice();
            state.selectedCreatorIndex = state.creators.length ? 0 : -1;
            UI.renderCreators(state.creators, state.selectedCreatorIndex);
            if (state.creators.length) {
                loadCreatorContent(state.creators[0], 0);
            }
        }

        function selectCreator(creator, index) {
            state.currentCreator = creator;
            state.selectedCreatorIndex = index;
            loadCreatorContent(creator, index);
        }

        function loadCreatorContent(creator) {
            if (!creator) {
                return;
            }
            if (state.useSampleData) {
                var sampleVideos = SAMPLE_DATA.videosByCreator[creator.id] || [];
                state.videos = sampleVideos.slice();
                state.selectedVideoIndex = sampleVideos.length ? 0 : -1;
                UI.renderVideos(state.videos, state.selectedVideoIndex);
                if (state.videos.length) {
                    updateActiveVideo(0);
                } else {
                    UI.updateVideoDetails(null);
                }
                return;
            }

            if (state.loadingVideos) {
                return;
            }
            state.loadingVideos = true;
            UI.showLoader('Loading videos…');
            contentService.getCreatorContent(creator.id, {
                limit: 36,
                withLivestream: true,
                includeDrafts: false
            }).then(function (data) {
                UI.hideLoader();
                state.loadingVideos = false;
                var videos = (data && data.items) || (data && data.posts) || data || [];
                state.videos = videos;
                state.selectedVideoIndex = videos.length ? 0 : -1;
                UI.renderVideos(videos, state.selectedVideoIndex);
                if (videos.length) {
                    updateActiveVideo(0);
                } else {
                    UI.updateVideoDetails(null);
                }
            }).catch(function (error) {
                UI.hideLoader();
                state.loadingVideos = false;
                Logger.warn('Failed to load creator content', error);
                UI.showToast('Unable to load videos. Try again later.');
            });
        }

        function updateActiveVideo(index) {
            if (index < 0 || index >= state.videos.length) {
                return;
            }
            state.selectedVideoIndex = index;
            var video = state.videos[index];
            state.currentVideo = video;
            UI.updateVideoDetails(video, StorageService.getProgress(video.id));
            if (playerController) {
                playerController.loadVideo(video);
            }
            if (video && !state.useSampleData) {
                prepareChat(video);
            }
        }

        function handleVideoSelection(index) {
            if (index < 0 || index >= state.videos.length) {
                return;
            }
            updateActiveVideo(index);
            ScreenManager.show('player');
            FocusManager.setFocus('player-controls', 0);
        }

        function playSelected(resume) {
            if (!state.currentVideo || !playerController) {
                return;
            }
            var resumeSeconds = null;
            if (resume) {
                var progress = StorageService.getProgress(state.currentVideo.id);
                resumeSeconds = progress && progress.position ? progress.position : null;
            }
            playerController.loadVideo(state.currentVideo, {
                resumeSeconds: resumeSeconds
            });
            ScreenManager.show('player');
            FocusManager.setFocus('player-controls', 0);
        }

        function exitPlayer() {
            ScreenManager.back();
            FocusManager.setFocus('creators', 0);
        }

        function toggleQualityMenu(open) {
            if (!dom.qualityMenu) {
                return;
            }
            const next = !state.qualityMenuOpen;
            state.qualityMenuOpen = !!next;
            dom.qualityMenu.classList.toggle('is-open', next);
            if (next) {
                FocusManager.setFocus('quality', 0);
            }
        }

        function setPlayerQuality(quality) {
            if (!playerController) {
                return;
            }
            playerController.setQuality(quality);
            UI.updateQualityButton(quality);
            if (state.currentVideo) {
                StorageService.setProgress(state.currentVideo.id, playerController.getState());
            }
        }

        function toggleChatPanel() {
            if (!state.chatConnected) {
                UI.showToast('Chat is not available for this video');
                return;
            }
            const next = !state.chatVisible;
            setChatVisibility(next);
            FocusManager.setFocus(next ? 'chat-controls' : 'player-controls', 0);
        }

        function setChatVisibility(visible, silent) {
            if (!dom.chatPanel) {
                return;
            }
            const previous = state.chatVisible;
            state.chatVisible = !!visible;
            dom.chatPanel.setAttribute('data-visible', state.chatVisible ? 'true' : 'false');
            if (!silent && previous !== state.chatVisible) {
                UI.showToast(state.chatVisible ? 'Chat opened' : 'Chat closed');
            }
        }

        function submitChatMessage() {
            if (!chatService || !dom.chatMessageInput) {
                return;
            }
            const text = dom.chatMessageInput.value.trim();
            if (!text) {
                return;
            }
            const success = chatService.sendMessage(text, state.currentUser);
            if (!success) {
                UI.showToast('Unable to send message');
                return;
            }
            dom.chatMessageInput.value = '';
        }

        function toggleViewingMode() {
            if (viewingModeManager) {
                viewingModeManager.toggle();
            }
        }

        function initPlayer() {
            if (!dom.videoElement) {
                return;
            }
            playerController = new PlayerController(dom.videoElement);
            playerController.on('timeupdate', function (info) {
                UI.updatePlayerOverlay({
                    title: state.currentVideo ? state.currentVideo.title : 'Now Playing',
                    creatorName: state.currentCreator ? state.currentCreator.name : '',
                    current: info.currentTime || 0,
                    duration: info.duration || 0,
                    isLive: info.isLive
                });
                if (state.currentVideo) {
                    StorageService.setProgress(state.currentVideo.id, {
                        position: info.currentTime || 0,
                        duration: info.duration || 0,
                        isLive: info.isLive
                    });
                }
            });
            playerController.on('statechange', function (payload) {
                if (payload && payload.state === 'loaded' && state.currentVideo && !state.currentVideo.isLive) {
                    const progress = StorageService.getProgress(state.currentVideo.id);
                    if (progress && progress.position) {
                        playerController.setResumeTime(progress.position);
                    }
                }
            });
            playerController.on('ended', function () {
                if (state.currentVideo) {
                    StorageService.clearProgress(state.currentVideo.id);
                }
                ScreenManager.back();
                FocusManager.setFocus('creators', 0);
            });
        }

        function initChatService() {
            if (chatService) {
                return;
            }
            chatService = new App.ChatService({
                sampleMode: state.useSampleData,
                apiClient: floatplaneClient,
                logger: Logger
            });
            chatService.on('status', function (payload) {
                state.chatConnected = payload && payload.status === 'connected';
                if (dom.chatPanel) {
                    dom.chatPanel.setAttribute('data-enabled', state.chatConnected ? 'true' : 'false');
                }
            });
            chatService.on('message', function (messages) {
                if (!dom.chatMessages) {
                    return;
                }
                dom.chatMessages.innerHTML = '';
                for (var i = 0; i < messages.length; i += 1) {
                    var msg = messages[i];
                    var row = document.createElement('div');
                    row.className = 'chat-message';
                    if (msg.system) {
                        row.classList.add('chat-message--system');
                    }
                    var user = document.createElement('span');
                    user.className = 'chat-message-user';
                    user.textContent = (msg.user && msg.user.displayName) || msg.user || 'Viewer';
                    if (msg.badges && msg.badges.length) {
                        for (var b = 0; b < msg.badges.length; b += 1) {
                            var badge = document.createElement('span');
                            badge.className = 'chat-message-badge';
                            badge.textContent = msg.badges[b];
                            user.appendChild(badge);
                        }
                    }
                    var text = document.createElement('span');
                    text.className = 'chat-message-text';
                    text.textContent = msg.text;
                    row.appendChild(user);
                    row.appendChild(text);
                    dom.chatMessages.appendChild(row);
                }
                dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
            });
            chatService.on('viewer', function (count) {
                if (dom.chatViewerCount) {
                    dom.chatViewerCount.textContent = '👁 ' + count;
                }
            });
        }

        function prepareChat(video) {
            if (!chatService) {
                initChatService();
            }
            if (!chatService) {
                return;
            }
            if (state.useSampleData) {
                chatService.setSampleMode(true);
                chatService.connect('sample-' + Date.now(), { sample: true });
                return;
            }
            chatService.setSampleMode(false);
            chatService.connect(video.id, { sample: false }).catch(function () {
                chatService.setSampleMode(true);
                chatService.connect('sample-' + Date.now(), { sample: true });
            });
        }

        function ensureJumpToLiveButton() {
            if (!playerController || typeof playerController._updateJumpToLiveButton === 'function') {
                return;
            }
            playerController._updateJumpToLiveButton = function () {
                if (!dom.playerJumpToLive || !playerController) {
                    return;
                }
                var liveState = playerController.getLiveState ? playerController.getLiveState() : null;
                var shouldShow = liveState && liveState.isLive && !liveState.isAtLiveEdge;
                dom.playerJumpToLive.classList.toggle('hidden', !shouldShow);
            };
        }

        function initViewingModeManager() {
            if (viewingModeManager || typeof ViewingModeManager !== 'function') {
                return;
            }
            viewingModeManager = new ViewingModeManager({
                container: dom.playerContainer,
                sidebar: dom.playerSidebar,
                chatPanel: dom.chatPanel,
                modeIndicator: dom.viewingModeIndicator,
                videoElement: dom.videoElement
            });
        }

        function initializeTurnstile() {
            if (!dom.turnstileContainer) {
                return;
            }
            if (turnstileFatal) {
                return;
            }
            if (window.turnstile && typeof window.turnstile.render === 'function') {
                try {
                    turnstileWidgetId = window.turnstile.render(dom.turnstileContainer, {
                        sitekey: TURNSTILE_SITE_KEY,
                        theme: 'auto',
                        action: 'login',
                        callback: function (token) {
                            turnstileExecuting = false;
                            turnstileToken = token || null;
                            if (pendingTurnstileCallback) {
                                pendingTurnstileCallback(turnstileToken);
                                pendingTurnstileCallback = null;
                            }
                            if (pendingLoginRequest) {
                                var queued = pendingLoginRequest;
                                pendingLoginRequest = null;
                                queued();
                            }
                        },
                        'error-callback': function () {
                            turnstileExecuting = false;
                            turnstileToken = null;
                            if (pendingTurnstileCallback) {
                                pendingTurnstileCallback(null);
                                pendingTurnstileCallback = null;
                            }
                            UI.showToast('Captcha verification failed. Please try again.');
                            if (pendingLoginRequest) {
                                pendingLoginRequest = null;
                            }
                        },
                        'expired-callback': function () {
                            turnstileExecuting = false;
                            turnstileToken = null;
                            if (window.turnstile && typeof window.turnstile.reset === 'function' && turnstileWidgetId) {
                                window.turnstile.reset(turnstileWidgetId);
                            }
                        }
                    });
                    turnstileDisabled = false;
                    turnstileAvailable = true;
                    dom.turnstileContainer.classList.remove('hidden');
                    if (pendingLoginRequest) {
                        var retryLogin = pendingLoginRequest;
                        pendingLoginRequest = null;
                        retryLogin();
                    }
                    return;
                } catch (error) {
                    turnstileFatal = true;
                    turnstileDisabled = true;
                    turnstileAvailable = false;
                    turnstileWidgetId = null;
                    turnstileToken = null;
                    if (Logger && typeof Logger.warn === 'function') {
                        Logger.warn('[Turnstile] Failed to initialize', error);
                    }
                    if (dom.turnstileContainer) {
                        dom.turnstileContainer.classList.add('hidden');
                    }
                    if (pendingLoginRequest) {
                        var queuedLogin = pendingLoginRequest;
                        pendingLoginRequest = null;
                        queuedLogin();
                    }
                    return;
                }
            }

            setTimeout(initializeTurnstile, 300);
        }

        function start() {
            cacheDom();
            initFocus();
            bindEvents();
            initPlayer();
            ensureJumpToLiveButton();
            initChatService();
            initViewingModeManager();
            const runningFromInsecureScheme = typeof window !== 'undefined'
                && (window.location.protocol === 'file:'
                    || window.location.protocol === 'app:'
                    || window.location.protocol === 'appdata:');

            if (runningFromInsecureScheme) {
                turnstileFatal = true;
                turnstileDisabled = true;
                turnstileAvailable = false;
                if (Logger && typeof Logger.warn === 'function') {
                    Logger.warn('[Turnstile] Disabled due to non-HTTPS origin:', window.location.protocol);
                }
                if (dom.turnstileContainer) {
                    dom.turnstileContainer.classList.add('hidden');
                }
            } else {
                turnstileFatal = false;
                turnstileDisabled = true;
                turnstileAvailable = false;
                initializeTurnstile();
            }

            state.currentUser = authService.getUser();
            if (state.currentUser) {
                UI.setStatusUser(state.currentUser.displayName || state.currentUser.email || 'Signed In');
                ScreenManager.show('home');
            } else if (state.useSampleData) {
                enableSampleMode(true);
            } else {
                ScreenManager.show('login');
                FocusManager.refreshGroup('login');
                FocusManager.refreshGroup('login-buttons');
                FocusManager.setFocus('login', 0);
            }

            UI.setStatusNetwork(state.networkOnline, state.useSampleData);
        }

        return {
            start: start,
            handleVideoSelection,
            toggleChatPanel,
            setChatVisibility,
            submitChatMessage,
            toggleViewingMode,
            initPlayer,
            initChatService,
            clearContent
        };
    }());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            AppController.start();
        });
    } else {
        AppController.start();
    }

    window.useCorsProxy = function (baseUrl) {
        const proxyUrl = baseUrl || 'http://localhost:3001/api';
        setApiBaseUrl(proxyUrl);
        // Update global options for new instances
        if (App.FloatplaneApiClient && typeof App.FloatplaneApiClient.setGlobalOptions === 'function') {
            App.FloatplaneApiClient.setGlobalOptions({
                baseUrl: proxyUrl,
                userAgent: CONFIG.app.userAgent
            });
        }
        // Update existing authService instance
        if (App._authService) {
            var client = App._authService.getClient ? App._authService.getClient() : App._authService;
            if (client && typeof client.setBaseUrl === 'function') {
                client.setBaseUrl(proxyUrl);
            }
            if (client && typeof client.setUserAgent === 'function') {
                client.setUserAgent(CONFIG.app.userAgent);
            }
        }
    };
}());
