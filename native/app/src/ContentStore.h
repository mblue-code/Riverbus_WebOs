#pragma once

#include <QObject>
#include <QVariantList>

class ApiClient;
class QNetworkReply;

class ContentStore : public QObject
{
    Q_OBJECT

public:
    explicit ContentStore(ApiClient *client, QObject *parent = nullptr);

    Q_INVOKABLE void refreshSubscriptions();
    Q_INVOKABLE void loadCreatorContent(const QString &creatorId);

    QVariantList creators() const;
    QVariantList videos() const;

signals:
    void creatorsUpdated();
    void videosUpdated();
    void requestFailed(const QString &message);

private:
    void handleSubscriptionsResponse(QNetworkReply *reply);
    void handleCreatorContentResponse(QNetworkReply *reply);

    ApiClient *m_client = nullptr;
    QVariantList m_creators;
    QVariantList m_videos;
};

