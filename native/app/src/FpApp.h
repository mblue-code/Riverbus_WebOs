#pragma once

#include <QObject>
#include <memory>

class QQmlApplicationEngine;
class LoginManager;
class PlayerController;
class SessionModel;
class ApiClient;
class ContentStore;
class CreatorListModel;
class VideoListModel;
class PersistentCookieJar;

class FpApp : public QObject
{
    Q_OBJECT

public:
    explicit FpApp(QObject *parent = nullptr);

    void initialize();

private:
    void registerTypes();
    void exposeContext();

    std::unique_ptr<QQmlApplicationEngine> m_engine;
    std::unique_ptr<ApiClient> m_apiClient;
    std::unique_ptr<PersistentCookieJar> m_cookieJar;
    std::unique_ptr<LoginManager> m_loginManager;
    std::unique_ptr<PlayerController> m_playerController;
    std::unique_ptr<SessionModel> m_sessionModel;
    std::unique_ptr<ContentStore> m_contentStore;
    std::unique_ptr<CreatorListModel> m_creatorModel;
    std::unique_ptr<VideoListModel> m_videoModel;
};

