#pragma once

#include <QObject>
#include <QVariantMap>

class QSettings;

class SessionModel : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool authenticated READ isAuthenticated NOTIFY authenticatedChanged)
    Q_PROPERTY(QString displayName READ displayName NOTIFY userChanged)
    Q_PROPERTY(QString email READ email NOTIFY userChanged)
    Q_PROPERTY(bool sampleMode READ sampleMode WRITE setSampleMode NOTIFY sampleModeChanged)

public:
    explicit SessionModel(QObject *parent = nullptr);

    bool isAuthenticated() const;
    QString displayName() const;
    QString email() const;
    bool sampleMode() const;

    Q_INVOKABLE void clear();
    void setUser(const QVariantMap &user);
    void setToken(const QString &token);
    QString token() const;
    void setSampleMode(bool enabled);

    void load(QSettings &settings);
    void save(QSettings &settings) const;

signals:
    void authenticatedChanged();
    void userChanged();
    void sampleModeChanged();

private:
    void persist() const;

    QVariantMap m_user;
    QString m_token;
    bool m_sampleMode = false;
};

