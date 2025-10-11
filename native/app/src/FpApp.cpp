#include "FpApp.h"

#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QSettings>

#include "LoginManager.h"
#include "PlayerController.h"
#include "SessionModel.h"
#include "ApiClient.h"
#include "ContentStore.h"
#include "CreatorListModel.h"
#include "VideoListModel.h"
#include "PersistentCookieJar.h"

FpApp::FpApp(QObject *parent)
    : QObject(parent)
{
    connect(qApp, &QCoreApplication::aboutToQuit, this, [this]() {
        if (m_cookieJar) {
            QSettings settings;
            m_cookieJar->save(settings);
        }
        if (m_sessionModel) {
            QSettings settings;
            m_sessionModel->save(settings);
        }
    });
}

void FpApp::initialize()
{
    registerTypes();

    ApiClient::Config config;
    config.baseUrl = QStringLiteral("https://www.floatplane.com/api");
    config.userAgent = QStringLiteral("Hydravion 1.0 (AndroidTV), CFNetwork");
    config.timeoutMs = 30000;

    m_cookieJar = std::make_unique<PersistentCookieJar>(this);
    QSettings settings;
    m_cookieJar->load(settings);

    m_apiClient = std::make_unique<ApiClient>(config, this);
    m_apiClient->setCookieJar(m_cookieJar.get());

    m_sessionModel = std::make_unique<SessionModel>(this);
    m_sessionModel->load(settings);
    m_loginManager = std::make_unique<LoginManager>(this);
    m_loginManager->setApiClient(m_apiClient.get());
    m_loginManager->setSessionModel(m_sessionModel.get());
    m_playerController = std::make_unique<PlayerController>(this);
    m_playerController->setApiClient(m_apiClient.get());

    m_contentStore = std::make_unique<ContentStore>(m_apiClient.get(), this);
    m_creatorModel = std::make_unique<CreatorListModel>(m_contentStore.get(), this);
    m_videoModel = std::make_unique<VideoListModel>(m_contentStore.get(), this);

    m_engine = std::make_unique<QQmlApplicationEngine>();
    exposeContext();

    const QUrl url(QStringLiteral("qrc:/Main.qml"));
    QObject::connect(
        m_engine.get(),
        &QQmlApplicationEngine::objectCreated,
        this,
        [url](QObject *obj, const QUrl &objUrl) {
            if (!obj && url == objUrl) {
                QCoreApplication::exit(-1);
            }
        },
        Qt::QueuedConnection);

    m_engine->load(url);
}

void FpApp::registerTypes()
{
    // TODO: Register any custom QML types.
}

void FpApp::exposeContext()
{
    if (!m_engine) {
        return;
    }

    auto *rootContext = m_engine->rootContext();
    rootContext->setContextProperty(QStringLiteral("loginManager"), m_loginManager.get());
    rootContext->setContextProperty(QStringLiteral("playerController"), m_playerController.get());
    rootContext->setContextProperty(QStringLiteral("sessionModel"), m_sessionModel.get());
    rootContext->setContextProperty(QStringLiteral("creatorModel"), m_creatorModel.get());
    rootContext->setContextProperty(QStringLiteral("videoModel"), m_videoModel.get());
    rootContext->setContextProperty(QStringLiteral("contentStore"), m_contentStore.get());
}

