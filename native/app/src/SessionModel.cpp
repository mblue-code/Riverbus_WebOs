#include "SessionModel.h"
#include <QSettings>

namespace {
const char *kSessionGroup = "session";
const char *kUserKey = "user";
const char *kTokenKey = "token";
const char *kSampleModeKey = "sampleMode";
}

SessionModel::SessionModel(QObject *parent)
    : QObject(parent)
{
}

bool SessionModel::isAuthenticated() const
{
    return !m_token.isEmpty() && !m_user.isEmpty() && !m_sampleMode;
}

QString SessionModel::displayName() const
{
    return m_user.value(QStringLiteral("displayName")).toString();
}

QString SessionModel::email() const
{
    return m_user.value(QStringLiteral("email")).toString();
}

bool SessionModel::sampleMode() const
{
    return m_sampleMode;
}

void SessionModel::clear()
{
    m_user.clear();
    m_token.clear();
    m_sampleMode = false;
    emit userChanged();
    emit authenticatedChanged();
    emit sampleModeChanged();
    persist();
}

void SessionModel::setUser(const QVariantMap &user)
{
    m_user = user;
    emit userChanged();
    emit authenticatedChanged();
    persist();
}

void SessionModel::setToken(const QString &token)
{
    m_token = token;
    emit authenticatedChanged();
    persist();
}

QString SessionModel::token() const
{
    return m_token;
}

void SessionModel::setSampleMode(bool enabled)
{
    if (m_sampleMode == enabled) {
        return;
    }
    m_sampleMode = enabled;
    emit sampleModeChanged();
    emit authenticatedChanged();
    persist();
}

void SessionModel::load(QSettings &settings)
{
    settings.beginGroup(QLatin1String(kSessionGroup));
    m_user = settings.value(QLatin1String(kUserKey)).toMap();
    m_token = settings.value(QLatin1String(kTokenKey)).toString();
    m_sampleMode = settings.value(QLatin1String(kSampleModeKey), false).toBool();
    settings.endGroup();
    emit userChanged();
    emit authenticatedChanged();
    emit sampleModeChanged();
}

void SessionModel::save(QSettings &settings) const
{
    settings.beginGroup(QLatin1String(kSessionGroup));
    settings.setValue(QLatin1String(kUserKey), m_user);
    settings.setValue(QLatin1String(kTokenKey), m_token);
    settings.setValue(QLatin1String(kSampleModeKey), m_sampleMode);
    settings.endGroup();
}

void SessionModel::persist() const
{
    QSettings settings;
    save(settings);
}

