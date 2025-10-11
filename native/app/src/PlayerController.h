#pragma once

#include <QObject>
#include <QScopedPointer>

class WebOSMediaPlayer;
class PlaybackInfo;
struct DeliveryInfo;

struct PlaybackSource {
    QString videoId;
    QString url;
    QString mimeType;
    bool isLive = false;
};

class PlayerController : public QObject
{
    Q_OBJECT

public:
    explicit PlayerController(QObject *parent = nullptr);

    void setApiClient(class ApiClient *client);

    Q_INVOKABLE void load(const QString &videoId);
    Q_INVOKABLE void loadFromUrl(const QString &url, const QString &mimeType, bool live = false);
    Q_INVOKABLE void play();
    Q_INVOKABLE void pause();
    Q_INVOKABLE void seek(qint64 seconds);

signals:
    void stateChanged(const QString &state);
    void progressChanged(qint64 position);
    void errorOccurred(const QString &message);

private:
    void handleDeliveryInfo(QNetworkReply *reply);
    void attachToPlayer();

    ApiClient *m_apiClient = nullptr;
    QScopedPointer<WebOSMediaPlayer> m_mediaPlayer;
    PlaybackSource m_currentSource;
};

