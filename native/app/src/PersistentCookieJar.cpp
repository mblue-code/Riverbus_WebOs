#include "PersistentCookieJar.h"

#include <QSettings>

namespace {
const char *kCookieGroup = "network/cookies";
}

PersistentCookieJar::PersistentCookieJar(QObject *parent)
    : QNetworkCookieJar(parent)
{
}

void PersistentCookieJar::load(QSettings &settings)
{
    settings.beginGroup(QLatin1String(kCookieGroup));
    const int count = settings.beginReadArray("items");
    QList<QNetworkCookie> cookies;
    cookies.reserve(count);

    for (int i = 0; i < count; ++i) {
        settings.setArrayIndex(i);
        const QByteArray value = settings.value("raw").toByteArray();
        const QList<QNetworkCookie> parsed = QNetworkCookie::parseCookies(value);
        for (const auto &cookie : parsed) {
            cookies.append(cookie);
        }
    }

    settings.endArray();
    settings.endGroup();

    if (!cookies.isEmpty()) {
        setAllCookies(cookies);
    }
}

void PersistentCookieJar::save(QSettings &settings) const
{
    settings.beginGroup(QLatin1String(kCookieGroup));
    settings.beginWriteArray("items");

    const auto cookies = allCookies();
    for (int i = 0; i < cookies.size(); ++i) {
        settings.setArrayIndex(i);
        settings.setValue("raw", cookies.at(i).toRawForm());
    }

    settings.endArray();
    settings.endGroup();
}

bool PersistentCookieJar::setCookiesFromUrl(const QList<QNetworkCookie> &cookieList, const QUrl &url)
{
    const bool result = QNetworkCookieJar::setCookiesFromUrl(cookieList, url);
    persist();
    return result;
}

void PersistentCookieJar::persist() const
{
    QSettings settings;
    save(settings);
}

