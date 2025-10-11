#include "ContentStore.h"

#include "ApiClient.h"

#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>
#include <QUrlQuery>

ContentStore::ContentStore(ApiClient *client, QObject *parent)
    : QObject(parent)
    , m_client(client)
{
}

void ContentStore::refreshSubscriptions()
{
    if (!m_client) {
        emit requestFailed(QStringLiteral("Content service unavailable"));
        return;
    }

    QUrlQuery query;
    query.addQueryItem(QStringLiteral("includeLivestream"), QStringLiteral("true"));
    query.addQueryItem(QStringLiteral("includeDvrStatus"), QStringLiteral("true"));
    auto *reply = m_client->get(QStringLiteral("/v3/user/subscriptions"), query);
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        handleSubscriptionsResponse(reply);
    });
}

void ContentStore::loadCreatorContent(const QString &creatorId)
{
    if (!m_client) {
        emit requestFailed(QStringLiteral("Content service unavailable"));
        return;
    }

    QUrlQuery query;
    query.addQueryItem(QStringLiteral("id"), creatorId);
    query.addQueryItem(QStringLiteral("hasVideo"), QStringLiteral("true"));
    query.addQueryItem(QStringLiteral("limit"), QStringLiteral("36"));
    auto *reply = m_client->get(QStringLiteral("/v3/content/creator"), query);
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        handleCreatorContentResponse(reply);
    });
}

QVariantList ContentStore::creators() const
{
    return m_creators;
}

QVariantList ContentStore::videos() const
{
    return m_videos;
}

void ContentStore::handleSubscriptionsResponse(QNetworkReply *reply)
{
    const auto data = reply->readAll();
    const auto doc = QJsonDocument::fromJson(data);

    if (reply->error() != QNetworkReply::NoError) {
        emit requestFailed(reply->errorString());
        reply->deleteLater();
        return;
    }

    if (doc.isObject()) {
        const QJsonArray list = doc.object().value(QStringLiteral("subscriptions")).toArray();
        QVariantList items;
        items.reserve(list.size());
        for (const auto &value : list) {
            items.append(value.toObject().toVariantMap());
        }
        m_creators = items;
    } else if (doc.isArray()) {
        const QJsonArray list = doc.array();
        QVariantList items;
        items.reserve(list.size());
        for (const auto &value : list) {
            items.append(value.toObject().toVariantMap());
        }
        m_creators = items;
    } else {
        m_creators.clear();
    }

    emit creatorsUpdated();
    reply->deleteLater();
}

void ContentStore::handleCreatorContentResponse(QNetworkReply *reply)
{
    const auto data = reply->readAll();
    const auto doc = QJsonDocument::fromJson(data);

    if (reply->error() != QNetworkReply::NoError) {
        emit requestFailed(reply->errorString());
        reply->deleteLater();
        return;
    }

    QVariantList items;

    if (doc.isObject()) {
        const QJsonArray list = doc.object().value(QStringLiteral("items")).toArray();
        for (const auto &value : list) {
            items.append(value.toObject().toVariantMap());
        }
    } else if (doc.isArray()) {
        const QJsonArray list = doc.array();
        for (const auto &value : list) {
            items.append(value.toObject().toVariantMap());
        }
    }

    m_videos = items;
    emit videosUpdated();
    reply->deleteLater();
}

