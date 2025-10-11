#include "LoginManager.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>

#include "ApiClient.h"
#include "SessionModel.h"

LoginManager::LoginManager(QObject *parent)
    : QObject(parent)
{
}

void LoginManager::setApiClient(ApiClient *client)
{
    m_apiClient = client;
}

void LoginManager::setSessionModel(SessionModel *session)
{
    m_sessionModel = session;
}

void LoginManager::login(const QString &email, const QString &password)
{
    if (!m_apiClient) {
        reportError(QStringLiteral("Networking unavailable"));
        return;
    }

    m_pendingEmail = email;
    m_pendingPassword = password;

    const QJsonObject payload{
        {QStringLiteral("username"), email},
        {QStringLiteral("password"), password}
    };

    auto *reply = m_apiClient->postJson(QStringLiteral("/v2/auth/login"), payload);
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        handleLoginResponse(reply);
    });
}

void LoginManager::factor(const QString &token)
{
    if (!m_apiClient || !m_waitingForFactor) {
        reportError(QStringLiteral("No pending verification"));
        return;
    }

    QJsonObject payload{{QStringLiteral("code"), token}};
    if (!m_pendingToken.isEmpty()) {
        payload.insert(QStringLiteral("token"), m_pendingToken);
    }

    auto *reply = m_apiClient->postJson(QStringLiteral("/v2/auth/factor"), payload);
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        handleFactorResponse(reply);
    });
}

void LoginManager::useSampleMode()
{
    if (m_sessionModel) {
        m_sessionModel->setSampleMode(true);
    }
    emit sampleModeActivated();
}

void LoginManager::handleLoginResponse(QNetworkReply *reply)
{
    const auto data = reply->readAll();
    const QJsonDocument doc = QJsonDocument::fromJson(data);
    if (!reply->isFinished()) {
        reply->deleteLater();
        return;
    }

    if (reply->error() != QNetworkReply::NoError) {
        reportError(reply->errorString());
        reply->deleteLater();
        return;
    }

    const QJsonObject obj = doc.object();
    if (obj.value(QStringLiteral("requiresTwoFactor")).toBool()) {
        m_waitingForFactor = true;
        m_pendingToken = obj.value(QStringLiteral("token")).toString();
        emit factorRequired();
        reply->deleteLater();
        return;
    }

    const QJsonObject user = obj.value(QStringLiteral("user")).toObject();
    const QString token = obj.value(QStringLiteral("sessionToken")).toString();

    if (m_sessionModel) {
        m_sessionModel->setUser(user.toVariantMap());
        m_sessionModel->setToken(token);
    }

    m_waitingForFactor = false;
    emit loginSucceeded();
    reply->deleteLater();
}

void LoginManager::handleFactorResponse(QNetworkReply *reply)
{
    const auto data = reply->readAll();
    const QJsonDocument doc = QJsonDocument::fromJson(data);

    if (reply->error() != QNetworkReply::NoError) {
        reportError(reply->errorString());
        reply->deleteLater();
        return;
    }

    const QJsonObject obj = doc.object();
    const QJsonObject user = obj.value(QStringLiteral("user")).toObject();
    const QString token = obj.value(QStringLiteral("sessionToken")).toString();

    if (m_sessionModel) {
        m_sessionModel->setUser(user.toVariantMap());
        m_sessionModel->setToken(token);
    }

    m_waitingForFactor = false;
    m_pendingToken.clear();
    emit loginSucceeded();
    reply->deleteLater();
}

void LoginManager::reportError(const QString &message)
{
    emit loginFailed(message);
}

