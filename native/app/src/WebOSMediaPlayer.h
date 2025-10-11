#pragma once

#include <QObject>
#include <QScopedPointer>
#include <QString>

class WebOSMediaPlayerPrivate;

class WebOSMediaPlayer : public QObject
{
    Q_OBJECT

public:
    explicit WebOSMediaPlayer(QObject *parent = nullptr);
    ~WebOSMediaPlayer() override;

    void load(const QString &url, const QString &mimeType, bool live);
    void play();
    void pause();
    void seek(qint64 seconds);
    void stop();

signals:
    void stateChanged(const QString &state);
    void progressChanged(qint64 position);
    void durationChanged(qint64 duration);
    void errorOccurred(const QString &message);

private slots:
    void handleTick();

private:
    void ensurePlayer();
    void teardown();
    void updateState(const QString &state);

    QScopedPointer<WebOSMediaPlayerPrivate> d;
};

