#pragma once

#include <QObject>
#include <QByteArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QUrl>

class PersistentCookieJar;

class ApiClient : public QObject
{
    Q_OBJECT

public:
    struct Config {
        QString baseUrl;
        QString userAgent;
        int timeoutMs = 30000;
    };

    explicit ApiClient(const Config &config, QObject *parent = nullptr);

    void setCookieJar(PersistentCookieJar *jar);

    QNetworkAccessManager *manager();

    QNetworkRequest createRequest(const QString &path) const;
    QNetworkRequest createAbsoluteRequest(const QUrl &url) const;

    QNetworkReply *postJson(const QString &path, const QJsonObject &payload);
    QNetworkReply *postJson(const QUrl &url, const QJsonObject &payload);
    QNetworkReply *get(const QString &path, const QUrlQuery &query = {});
    QNetworkReply *get(const QUrl &url);

    QString baseUrl() const;

signals:
    void networkError(const QString &context, const QString &message);

private slots:
    void onReplyError(QNetworkReply::NetworkError code);

private:
    QJsonDocument readJson(QNetworkReply *reply) const;

    Config m_config;
    QScopedPointer<QNetworkAccessManager> m_manager;
};

