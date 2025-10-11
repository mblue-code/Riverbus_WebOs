/*
 * Content service for Floatplane APIs with caching and retry logic.
 */
(function (window) {
    'use strict';

    var App = window.App = window.App || {};

    function FloatplaneContentService(options) {
        options = options || {};
        var client = options.client || (App.AuthService && new App.AuthService(options.config));
        if (!client) {
            throw new Error('ContentService requires a FloatplaneApiClient via options.client or App.AuthService.');
        }
        this.apiClient = client.getClient ? client.getClient() : client;
    }

    FloatplaneContentService.prototype.getUserSubscriptions = function (params) {
        return this.apiClient.getUserSubscriptions(params);
    };

    FloatplaneContentService.prototype.getCreatorContent = function (creatorId, options) {
        return this.apiClient.getCreatorContent(creatorId, options);
    };

    FloatplaneContentService.prototype.getVideoDeliveryInfo = function (videoId) {
        return this.apiClient.getVideoDeliveryInfo(videoId);
    };

    FloatplaneContentService.prototype.refreshSession = function () {
        return this.apiClient.refreshSession();
    };

    App.ContentService = FloatplaneContentService;
}(window));

