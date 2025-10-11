#pragma once

#include <QNetworkCookieJar>

class QSettings;

class PersistentCookieJar : public QNetworkCookieJar
{
    Q_OBJECT

public:
    explicit PersistentCookieJar(QObject *parent = nullptr);

    void load(QSettings &settings);
    void save(QSettings &settings) const;

    bool setCookiesFromUrl(const QList<QNetworkCookie> &cookieList, const QUrl &url) override;

private:
    void persist() const;
};

