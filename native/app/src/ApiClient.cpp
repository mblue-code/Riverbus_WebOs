#include "ApiClient.h"

#include "PersistentCookieJar.h"

#include <QJsonDocument>
#include <QNetworkCookieJar>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QTimer>

ApiClient::ApiClient(const Config &config, QObject *parent)
    : QObject(parent)
    , m_config(config)
    , m_manager(new QNetworkAccessManager(this))
{
    m_manager->setTransferTimeout(m_config.timeoutMs);
}

void ApiClient::setCookieJar(PersistentCookieJar *jar)
{
    if (m_manager) {
        m_manager->setCookieJar(jar);
    }
}

QNetworkAccessManager *ApiClient::manager()
{
    return m_manager.get();
}

QNetworkRequest ApiClient::createRequest(const QString &path) const
{
    QUrl url(m_config.baseUrl);
    url.setPath(url.path() + path);
    return createAbsoluteRequest(url);
}

QNetworkRequest ApiClient::createAbsoluteRequest(const QUrl &url) const
{
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::UserAgentHeader, m_config.userAgent);
    request.setHeader(QNetworkRequest::ContentTypeHeader, QStringLiteral("application/json"));
    request.setRawHeader("Accept", "application/json");
    return request;
}

QNetworkReply *ApiClient::postJson(const QString &path, const QJsonObject &payload)
{
    return postJson(QUrl(m_config.baseUrl + path), payload);
}

QNetworkReply *ApiClient::postJson(const QUrl &url, const QJsonObject &payload)
{
    auto request = createAbsoluteRequest(url);
    auto *reply = m_manager->post(request, QJsonDocument(payload).toJson(QJsonDocument::Compact));
    connect(reply, &QNetworkReply::errorOccurred, this, &ApiClient::onReplyError);
    return reply;
}

QNetworkReply *ApiClient::get(const QString &path, const QUrlQuery &query)
{
    QUrl url(m_config.baseUrl + path);
    url.setQuery(query);
    return get(url);
}

QNetworkReply *ApiClient::get(const QUrl &url)
{
    auto request = createAbsoluteRequest(url);
    auto *reply = m_manager->get(request);
    connect(reply, &QNetworkReply::errorOccurred, this, &ApiClient::onReplyError);
    return reply;
}

QString ApiClient::baseUrl() const
{
    return m_config.baseUrl;
}

void ApiClient::onReplyError(QNetworkReply::NetworkError code)
{
    auto *reply = qobject_cast<QNetworkReply *>(sender());
    if (!reply) {
        return;
    }
    emit networkError(reply->url().toString(), reply->errorString());
}

