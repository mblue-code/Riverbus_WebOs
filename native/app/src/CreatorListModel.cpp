#include "CreatorListModel.h"

#include "ContentStore.h"

CreatorListModel::CreatorListModel(ContentStore *store, QObject *parent)
    : QAbstractListModel(parent)
    , m_store(store)
{
    if (m_store) {
        connect(m_store, &ContentStore::creatorsUpdated, this, &CreatorListModel::onCreatorsUpdated);
    }
}

int CreatorListModel::rowCount(const QModelIndex &parent) const
{
    if (parent.isValid() || !m_store) {
        return 0;
    }
    return m_store->creators().size();
}

QVariant CreatorListModel::data(const QModelIndex &index, int role) const
{
    if (!index.isValid() || !m_store) {
        return QVariant();
    }

    const QVariantList creators = m_store->creators();
    if (index.row() < 0 || index.row() >= creators.size()) {
        return QVariant();
    }

    const QVariantMap creator = creators.at(index.row()).toMap();

    switch (role) {
    case IdRole:
        return creator.value(QStringLiteral("id"));
    case NameRole:
        return creator.value(QStringLiteral("name"));
    case DescriptionRole:
        return creator.value(QStringLiteral("description"));
    case AvatarRole:
        return creator.value(QStringLiteral("avatar"));
    default:
        return QVariant();
    }
}

QHash<int, QByteArray> CreatorListModel::roleNames() const
{
    QHash<int, QByteArray> roles;
    roles[IdRole] = "creatorId";
    roles[NameRole] = "name";
    roles[DescriptionRole] = "description";
    roles[AvatarRole] = "avatar";
    return roles;
}

QVariantMap CreatorListModel::get(int index) const
{
    if (!m_store) {
        return {};
    }

    const QVariantList creators = m_store->creators();
    if (index < 0 || index >= creators.size()) {
        return {};
    }

    return creators.at(index).toMap();
}

void CreatorListModel::onCreatorsUpdated()
{
    beginResetModel();
    endResetModel();
}

