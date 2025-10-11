#pragma once

#include <QAbstractListModel>

class ContentStore;

class CreatorListModel : public QAbstractListModel
{
    Q_OBJECT

public:
    enum Roles {
        IdRole = Qt::UserRole + 1,
        NameRole,
        DescriptionRole,
        AvatarRole
    };

    explicit CreatorListModel(ContentStore *store, QObject *parent = nullptr);

    int rowCount(const QModelIndex &parent = QModelIndex()) const override;
    QVariant data(const QModelIndex &index, int role = Qt::DisplayRole) const override;
    QHash<int, QByteArray> roleNames() const override;

    Q_INVOKABLE QVariantMap get(int index) const;

private slots:
    void onCreatorsUpdated();

private:
    ContentStore *m_store = nullptr;
};

