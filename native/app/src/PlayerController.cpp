#include "PlayerController.h"

#include <QDebug>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>

#include "ApiClient.h"
#include "WebOSMediaPlayer.h"

PlayerController::PlayerController(QObject *parent)
    : QObject(parent)
{
}

void PlayerController::setApiClient(ApiClient *client)
{
    m_apiClient = client;
}

void PlayerController::load(const QString &videoId)
{
    if (!m_apiClient) {
        emit errorOccurred(QStringLiteral("API unavailable"));
        return;
    }

    QUrlQuery query;
    query.addQueryItem(QStringLiteral("type"), QStringLiteral("video"));
    query.addQueryItem(QStringLiteral("id"), videoId);
    auto *reply = m_apiClient->get(QStringLiteral("/v2/cdn/delivery"), query);
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        handleDeliveryInfo(reply);
    });
}

void PlayerController::loadFromUrl(const QString &url, const QString &mimeType, bool live)
{
    m_currentSource.videoId.clear();
    m_currentSource.url = url;
    m_currentSource.mimeType = mimeType;
    m_currentSource.isLive = live;
    attachToPlayer();
}

void PlayerController::play()
{
    if (!m_mediaPlayer) {
        attachToPlayer();
    }
    if (m_mediaPlayer) {
        m_mediaPlayer->play();
    }
}

void PlayerController::pause()
{
    if (m_mediaPlayer) {
        m_mediaPlayer->pause();
    }
}

void PlayerController::seek(qint64 seconds)
{
    if (m_mediaPlayer) {
        m_mediaPlayer->seek(seconds);
    }
}

void PlayerController::handleDeliveryInfo(QNetworkReply *reply)
{
    const auto data = reply->readAll();
    const QJsonDocument doc = QJsonDocument::fromJson(data);

    if (reply->error() != QNetworkReply::NoError) {
        emit errorOccurred(reply->errorString());
        reply->deleteLater();
        return;
    }

    const QJsonObject obj = doc.object();
    const QJsonObject source = obj.value(QStringLiteral("source"))
                                 .toObject();

    const QString uri = source.value(QStringLiteral("uri")).toString();
    const QString mime = source.value(QStringLiteral("mime"))
                            .toString(QStringLiteral("application/x-mpegurl"));
    const bool live = source.value(QStringLiteral("type")).toString() == QStringLiteral("stream");

    if (uri.isEmpty()) {
        emit errorOccurred(QStringLiteral("Playback URL missing"));
        reply->deleteLater();
        return;
    }

    m_currentSource.videoId = obj.value(QStringLiteral("id")).toString();
    m_currentSource.url = uri;
    m_currentSource.mimeType = mime;
    m_currentSource.isLive = live;

    attachToPlayer();
    reply->deleteLater();
}

void PlayerController::attachToPlayer()
{
    if (!m_mediaPlayer) {
        m_mediaPlayer.reset(new WebOSMediaPlayer(this));
        connect(m_mediaPlayer.get(), &WebOSMediaPlayer::stateChanged, this, &PlayerController::stateChanged);
        connect(m_mediaPlayer.get(), &WebOSMediaPlayer::progressChanged, this, &PlayerController::progressChanged);
        connect(m_mediaPlayer.get(), &WebOSMediaPlayer::errorOccurred, this, &PlayerController::errorOccurred);
    }

    if (m_currentSource.url.isEmpty()) {
        return;
    }

    m_mediaPlayer->load(m_currentSource.url, m_currentSource.mimeType, m_currentSource.isLive);
}

