#pragma once

#include <QObject>

class ApiClient;
class SessionModel;
class QNetworkReply;

class LoginManager : public QObject
{
    Q_OBJECT

public:
    explicit LoginManager(QObject *parent = nullptr);

    void setApiClient(ApiClient *client);
    void setSessionModel(SessionModel *session);

    Q_INVOKABLE void login(const QString &email, const QString &password);
    Q_INVOKABLE void factor(const QString &token);
    Q_INVOKABLE void useSampleMode();

signals:
    void loginSucceeded();
    void loginFailed(const QString &error);
    void factorRequired();
    void sampleModeActivated();

private:
    void handleLoginResponse(QNetworkReply *reply);
    void handleFactorResponse(QNetworkReply *reply);
    void reportError(const QString &message);

    ApiClient *m_apiClient = nullptr;
    SessionModel *m_sessionModel = nullptr;
    QString m_pendingEmail;
    QString m_pendingPassword;
    bool m_waitingForFactor = false;
    QString m_pendingToken;
};

