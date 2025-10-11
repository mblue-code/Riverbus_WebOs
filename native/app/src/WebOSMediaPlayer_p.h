#pragma once

#include <QString>
#include <QTimer>

#include <lunaservice.h>

struct WebOSMediaPlayerPrivate
{
    WebOSMediaPlayerPrivate();
    ~WebOSMediaPlayerPrivate();

    LSHandle *sessionHandle = nullptr;
    LSToken statusToken = LSMESSAGE_TOKEN_INVALID;
    QString sessionId;
    QString state;
    QString lastStatus;
    QTimer *pollTimer = nullptr;
    LSError lastError;
};
