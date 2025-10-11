#include "WebOSMediaPlayer.h"

#include <QCoreApplication>
#include <QJsonDocument>
#include <QJsonObject>
#include <QLoggingCategory>
#include <QTimer>

#include <lunaservice.h>

#include "WebOSMediaPlayer_p.h"

Q_LOGGING_CATEGORY(lcPlayer, "floatplane.player")

namespace {
const char *kServiceUri = "luna://com.webos.media";
const char *kRegister = "register";
const char *kLoad = "load";
const char *kPlay = "play";
const char *kPause = "pause";
const char *kSeek = "seek";
const char *kStop = "stop";
const char *kStateStatus = "status";
const char *kCurrentTime = "currentTime";
const char *kDuration = "duration";
const int kStatusIntervalMs = 750;
}

static bool postSimple(LSError &error, LSHandle *handle, const QString &method, const QJsonObject &payload)
{
    QByteArray body = QJsonDocument(payload).toJson(QJsonDocument::Compact);
    if (!LSCall(handle, QString("%1/%2").arg(kServiceUri, method).toUtf8().constData(), body.constData(), nullptr, nullptr, nullptr, &error)) {
        qCWarning(lcPlayer) << "LSCall failed" << method << error.message;
        return false;
    }
    return true;
}

WebOSMediaPlayerPrivate::WebOSMediaPlayerPrivate()
    : pollTimer(new QTimer)
{
    LSErrorInit(&lastError);
}

WebOSMediaPlayerPrivate::~WebOSMediaPlayerPrivate()
{
    if (sessionHandle) {
        LSUnregister(sessionHandle, nullptr);
        sessionHandle = nullptr;
    }
    if (pollTimer) {
        pollTimer->stop();
        pollTimer->deleteLater();
        pollTimer = nullptr;
    }
}

WebOSMediaPlayer::WebOSMediaPlayer(QObject *parent)
    : QObject(parent)
    , d(new WebOSMediaPlayerPrivate)
{
    connect(d->pollTimer, &QTimer::timeout, this, &WebOSMediaPlayer::handleTick);
    d->pollTimer->setInterval(kStatusIntervalMs);
}

WebOSMediaPlayer::~WebOSMediaPlayer()
{
    teardown();
}

void WebOSMediaPlayer::load(const QString &url, const QString &mimeType, bool live)
{
    ensurePlayer();

    QJsonObject source{
        {QStringLiteral("type"), live ? QStringLiteral("live" ) : QStringLiteral("media")},
        {QStringLiteral("url"), url},
        {QStringLiteral("mime"), mimeType}
    };

    QJsonObject payload{
        {QStringLiteral("sessionId"), d->sessionId},
        {QStringLiteral("payload"), QJsonObject{
             {QStringLiteral("source"), source},
             {QStringLiteral("options"), QJsonObject{
                  {QStringLiteral("transport"), QStringLiteral("hls" )},
                  {QStringLiteral("fullscreen"), true}
             }}
         }}
    };

    LSError error;
    LSErrorInit(&error);
    if (!postSimple(error, d->sessionHandle, kLoad, payload)) {
        emit errorOccurred(QString::fromUtf8(error.message));
        return;
    }

    updateState(QStringLiteral("loaded"));
    d->pollTimer->start();
}

void WebOSMediaPlayer::play()
{
    if (!ensurePlayer()) {
        return;
    }

    LSError error;
    LSErrorInit(&error);
    if (!postSimple(error, d->sessionHandle, kPlay, QJsonObject{{QStringLiteral("sessionId"), d->sessionId}})) {
        emit errorOccurred(QString::fromUtf8(error.message));
        return;
    }
    updateState(QStringLiteral("playing"));
}

void WebOSMediaPlayer::pause()
{
    if (!d->sessionHandle) {
        return;
    }

    LSError error;
    LSErrorInit(&error);
    if (!postSimple(error, d->sessionHandle, kPause, QJsonObject{{QStringLiteral("sessionId"), d->sessionId}})) {
        emit errorOccurred(QString::fromUtf8(error.message));
        return;
    }
    updateState(QStringLiteral("paused"));
}

void WebOSMediaPlayer::seek(qint64 seconds)
{
    if (!d->sessionHandle) {
        return;
    }

    QJsonObject payload{
        {QStringLiteral("sessionId"), d->sessionId},
        {QStringLiteral("target"), seconds * 1000}
    };
    LSError error;
    LSErrorInit(&error);
    if (!postSimple(error, d->sessionHandle, kSeek, payload)) {
        emit errorOccurred(QString::fromUtf8(error.message));
    }
}

void WebOSMediaPlayer::stop()
{
    if (!d->sessionHandle) {
        return;
    }

    LSError error;
    LSErrorInit(&error);
    postSimple(error, d->sessionHandle, kStop, QJsonObject{{QStringLiteral("sessionId"), d->sessionId}});
    d->pollTimer->stop();
    updateState(QStringLiteral("stopped"));
}

void WebOSMediaPlayer::handleTick()
{
    if (!d->sessionHandle) {
        return;
    }

    QJsonObject payload{{QStringLiteral("sessionId"), d->sessionId}};

    LSError error;
    LSErrorInit(&error);
    LSMessage *message = nullptr;
    if (!LSCallOneReply(d->sessionHandle, QString("%1/%2").arg(kServiceUri, kStateStatus).toUtf8().constData(),
                        QJsonDocument(payload).toJson(QJsonDocument::Compact).constData(),
                        [](LSHandle *, LSMessage *msg, void *ctx) -> bool {
                            auto *self = static_cast<WebOSMediaPlayer *>(ctx);
                            self->d->lastStatus = QString::fromUtf8(LSMessageGetPayload(msg));
                            return true;
                        }, this, &d->statusToken, &error)) {
        qCWarning(lcPlayer) << "status poll failed" << error.message;
        return;
    }

    if (!d->lastStatus.isEmpty()) {
        const QJsonDocument doc = QJsonDocument::fromJson(d->lastStatus.toUtf8());
        const QJsonObject obj = doc.object();
        const QString state = obj.value(QStringLiteral("state")).toString();
        if (!state.isEmpty()) {
            updateState(state);
        }
        const qint64 position = obj.value(QStringLiteral(kCurrentTime)).toDouble() / 1000.0;
        emit progressChanged(position);
        const qint64 duration = obj.value(QStringLiteral(kDuration)).toDouble() / 1000.0;
        emit durationChanged(duration);
        d->lastStatus.clear();
    }
}

bool WebOSMediaPlayer::ensurePlayer()
{
    if (d->sessionHandle && !d->sessionId.isEmpty()) {
        return true;
    }

    LSError error;
    LSErrorInit(&error);
    if (!LSRegister(nullptr, &d->sessionHandle, &error)) {
        emit errorOccurred(QString::fromUtf8(error.message));
        return false;
    }

    QJsonObject payload{{QStringLiteral("subscribe"), true}};
    if (!LSCallOneReply(d->sessionHandle, QString("%1/%2").arg(kServiceUri, kRegister).toUtf8().constData(),
                        QJsonDocument(payload).toJson(QJsonDocument::Compact).constData(),
                        [](LSHandle *, LSMessage *message, void *ctx) -> bool {
                            auto *self = static_cast<WebOSMediaPlayer *>(ctx);
                            const QByteArray payload = LSMessageGetPayload(message);
                            const QJsonObject obj = QJsonDocument::fromJson(payload).object();
                            self->d->sessionId = obj.value(QStringLiteral("sessionId")).toString();
                            return !self->d->sessionId.isEmpty();
                        }, this, nullptr, &error)) {
        emit errorOccurred(QString::fromUtf8(error.message));
        return false;
    }

    if (d->sessionId.isEmpty()) {
        emit errorOccurred(QStringLiteral("Failed to obtain AVPlay session"));
        return false;
    }

    return true;
}

void WebOSMediaPlayer::teardown()
{
    stop();
    if (d->sessionHandle) {
        LSUnregister(d->sessionHandle, nullptr);
        d->sessionHandle = nullptr;
    }
    d->sessionId.clear();
}

void WebOSMediaPlayer::updateState(const QString &state)
{
    if (d->state == state) {
        return;
    }
    d->state = state;
    emit stateChanged(state);
}

