#include "VideoListModel.h"

#include "ContentStore.h"

VideoListModel::VideoListModel(ContentStore *store, QObject *parent)
    : QAbstractListModel(parent)
    , m_store(store)
{
    if (m_store) {
        connect(m_store, &ContentStore::videosUpdated, this, &VideoListModel::onVideosUpdated);
    }
}

int VideoListModel::rowCount(const QModelIndex &parent) const
{
    if (parent.isValid() || !m_store) {
        return 0;
    }
    return m_store->videos().size();
}

QVariant VideoListModel::data(const QModelIndex &index, int role) const
{
    if (!index.isValid() || !m_store) {
        return QVariant();
    }

    const QVariantList videos = m_store->videos();
    if (index.row() < 0 || index.row() >= videos.size()) {
        return QVariant();
    }

    const QVariantMap video = videos.at(index.row()).toMap();

    switch (role) {
    case VideoIdRole:
        return video.value(QStringLiteral("id"));
    case TitleRole:
        return video.value(QStringLiteral("title"));
    case DurationRole:
        return video.value(QStringLiteral("duration"));
    case DescriptionRole:
        return video.value(QStringLiteral("description"));
    case ThumbnailRole:
        return video.value(QStringLiteral("thumbnail"));
    default:
        return QVariant();
    }
}

QHash<int, QByteArray> VideoListModel::roleNames() const
{
    QHash<int, QByteArray> roles;
    roles[VideoIdRole] = "videoId";
    roles[TitleRole] = "title";
    roles[DurationRole] = "duration";
    roles[DescriptionRole] = "description";
    roles[ThumbnailRole] = "thumbnail";
    return roles;
}

QVariantMap VideoListModel::get(int index) const
{
    if (!m_store) {
        return {};
    }

    const QVariantList videos = m_store->videos();
    if (index < 0 || index >= videos.size()) {
        return {};
    }

    return videos.at(index).toMap();
}

void VideoListModel::onVideosUpdated()
{
    beginResetModel();
    endResetModel();
}

