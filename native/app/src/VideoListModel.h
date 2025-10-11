#pragma once

#include <QAbstractListModel>

class ContentStore;

class VideoListModel : public QAbstractListModel
{
    Q_OBJECT

public:
    enum Roles {
        VideoIdRole = Qt::UserRole + 1,
        TitleRole,
        DurationRole,
        DescriptionRole,
        ThumbnailRole
    };

    explicit VideoListModel(ContentStore *store, QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    Q_INVOKABLE QVariantMap get(int index) const;

private slots:
    void onVideosUpdated();

private:
    ContentStore *m_store = nullptr;
};

