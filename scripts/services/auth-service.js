/*
 * Authentication service handling login, two-factor, and session storage.
 */
(function (window) {
    'use strict';

    var App = window.App = window.App || {};

    function FloatplaneAuthService(config) {
        if (!App.FloatplaneApiClient) {
            throw new Error('FloatplaneApiClient is not available. Ensure floatplane-api-client.js is loaded before auth-service.js.');
        }
        this.client = new App.FloatplaneApiClient(config || {});
    }

    FloatplaneAuthService.prototype.login = function (username, password, twoFactorToken, captchaToken) {
        return this.client.login(username, password, twoFactorToken, captchaToken);
    };

    FloatplaneAuthService.prototype.verifyTwoFactor = function (code) {
        return this.client.verifyTwoFactor(code);
    };

    FloatplaneAuthService.prototype.logout = function () {
        this.client.logout();
    };

    FloatplaneAuthService.prototype.isAuthenticated = function () {
        return this.client.isAuthenticated();
    };

    FloatplaneAuthService.prototype.getUser = function () {
        return this.client.getUser();
    };

    FloatplaneAuthService.prototype.getSessionToken = function () {
        return this.client.getSessionToken();
    };

    FloatplaneAuthService.prototype.getCookie = function () {
        return this.client.getSessionCookie();
    };

    FloatplaneAuthService.prototype.getCsrfToken = function () {
        return this.client.getCsrfToken();
    };

    FloatplaneAuthService.prototype.getClient = function () {
        return this.client;
    };

    App.AuthService = FloatplaneAuthService;
}(window));

