import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

Item {
    id: root
    width: 1920
    height: 1080

    signal openVideoRequested(string videoId)

    property int selectedCreatorIndex: -1
    property int selectedVideoIndex: -1

    gradient: Gradient {
        GradientStop { position: 0.0; color: "#05060a" }
        GradientStop { position: 0.6; color: "#05060a" }
        GradientStop { position: 1.0; color: "#03050e" }
    }

    Rectangle {
        anchors.fill: parent
        color: "#05060a"
    }

    Image {
        anchors.fill: parent
        source: "qrc:/images/bg.png"
        fillMode: Image.PreserveAspectCrop
        opacity: 0.22
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 48
        spacing: 32

        RowLayout {
            Layout.fillWidth: true
            spacing: 24

            Rectangle {
                width: 100
                height: 100
                radius: 20
                color: "#0f162c"
                border.color: "#2e4c91"

                Image {
                    anchors.fill: parent
                    anchors.margins: 12
                    source: "qrc:/images/icon.png"
                    fillMode: Image.PreserveAspectFit
                }
            }

            ColumnLayout {
                spacing: 12

                Label {
                    text: qsTr("Floatplane – Home")
                    font.pixelSize: 42
                    font.bold: true
                    color: "#f5f7ff"
                }

                Label {
                    text: qsTr("Browse creators, jump into videos, and manage your viewing mode.")
                    font.pixelSize: 22
                    color: "#a8b5d8"
                }
            }

            Item { Layout.fillWidth: true }

            Button {
                text: qsTr("Settings")
                font.pixelSize: 22
                background: Rectangle {
                    implicitHeight: 64
                    radius: 16
                    color: "#0c1326"
                    border.width: 2
                    border.color: "#20335c"
                }
                contentItem: Text {
                    text: control.text
                    anchors.centerIn: parent
                    font.pixelSize: 22
                    color: "#a8b5d8"
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 40

            ListView {
                id: creatorList
                Layout.preferredWidth: 420
                Layout.fillHeight: true
                model: creatorModel
                currentIndex: root.selectedCreatorIndex
                clip: true
                spacing: 16
                keyNavigationWraps: true
                snapMode: ListView.SnapToItem
                focus: true

                Keys.onReturnPressed: {
                    root.selectedCreatorIndex = currentIndex
                    contentStore.loadCreatorContent(creatorModel.get(currentIndex).creatorId)
                    videoGrid.forceActiveFocus()
                }

                delegate: Rectangle {
                    width: creatorList.width
                    height: 120
                    radius: 22
                    color: creatorList.currentIndex === index ? "#1b2b50" : "#0f162c"
                    border.width: creatorList.currentIndex === index ? 2 : 1
                    border.color: creatorList.currentIndex === index ? "#4a9eff" : "#172749"
                    Behavior on color { ColorAnimation { duration: 120 } }

                    RowLayout {
                        anchors.fill: parent
                        anchors.margins: 18
                        spacing: 16

                        Rectangle {
                            width: 64
                            height: 64
                            radius: 18
                            color: "#213973"
                            border.color: "#315ab1"
                            Text {
                                anchors.centerIn: parent
                                text: model.name[0]
                                font.pixelSize: 28
                                font.bold: true
                                color: "#f5f7ff"
                            }
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 6

                            Label {
                                text: model.name
                                font.pixelSize: 26
                                font.weight: Font.DemiBold
                                color: "#f5f7ff"
                            }

                            Label {
                                text: model.description
                                font.pixelSize: 20
                                color: "#a8b5d8"
                                elide: Text.ElideRight
                            }
                        }
                    }
                }
            }

            ColumnLayout {
                Layout.fillWidth: true
                Layout.fillHeight: true
                spacing: 24

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    Label {
                        visible: root.selectedCreatorIndex >= 0
                        text: root.selectedCreatorIndex >= 0 ? creatorModel.get(root.selectedCreatorIndex).name : ""
                        font.pixelSize: 40
                        font.bold: true
                        color: "#f5f7ff"
                    }

                    Label {
                        visible: root.selectedCreatorIndex >= 0
                        text: root.selectedCreatorIndex >= 0 ? creatorModel.get(root.selectedCreatorIndex).description : ""
                        font.pixelSize: 22
                        color: "#a8b5d8"
                        wrapMode: Text.Wrap
                        Layout.maximumWidth: 920
                    }
                }

                GridView {
                    id: videoGrid
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    cellWidth: 340
                    cellHeight: 260
                    model: videoModel
                    currentIndex: root.selectedVideoIndex
                    keyNavigationWraps: true
                    focus: true

                    Keys.onReturnPressed: {
                        var item = videoModel.get(currentIndex)
                        root.openVideoRequested(item.videoId)
                    }

                    delegate: Rectangle {
                        width: videoGrid.cellWidth - 24
                        height: videoGrid.cellHeight - 24
                        radius: 24
                        color: videoGrid.currentIndex === index ? "#1b2b50" : "#0f162c"
                        border.width: videoGrid.currentIndex === index ? 2 : 1
                        border.color: videoGrid.currentIndex === index ? "#4a9eff" : "#172749"
                        Behavior on color { ColorAnimation { duration: 120 } }

                        ColumnLayout {
                            anchors.fill: parent
                            anchors.margins: 18
                            spacing: 12

                            Rectangle {
                                Layout.fillWidth: true
                                Layout.preferredHeight: 150
                                radius: 18
                                gradient: Gradient {
                                    GradientStop { position: 0.0; color: "#1a68ff" }
                                    GradientStop { position: 1.0; color: "#213973" }
                                }
                                border.width: 0
                                opacity: 0.78
                                Text {
                                    anchors.centerIn: parent
                                    text: qsTr("Thumbnail")
                                    font.pixelSize: 24
                                    color: "#dce6ff"
                                }
                            }

                            Label {
                                text: model.title
                                font.pixelSize: 24
                                font.weight: Font.DemiBold
                                color: "#f5f7ff"
                                wrapMode: Text.Wrap
                                Layout.fillWidth: true
                                Layout.maximumHeight: 60
                            }

                            RowLayout {
                                Layout.fillWidth: true
                                spacing: 12

                                Label {
                                    text: model.duration
                                    font.pixelSize: 20
                                    color: "#a8b5d8"
                                }

                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 1
                                    color: "#1d2a49"
                                }

                                Label {
                                    text: qsTr("HD")
                                    font.pixelSize: 18
                                    color: "#4a9eff"
                                    font.bold: true
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

