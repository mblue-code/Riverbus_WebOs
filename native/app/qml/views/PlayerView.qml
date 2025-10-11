import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

FocusScope {
    id: root
    width: 1920
    height: 1080

    property string videoId: ""
    signal exitRequested()

    Keys.onEscapePressed: exitRequested()
    Keys.onBackPressed: exitRequested()

    Rectangle {
        anchors.fill: parent
        color: "#010203"
    }

    Image {
        anchors.fill: parent
        source: "qrc:/images/bg.png"
        fillMode: Image.PreserveAspectCrop
        opacity: 0.1
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 32
        spacing: 24

        RowLayout {
            Layout.fillWidth: true
            spacing: 18

            Button {
                text: qsTr("Back")
                focus: true
                onClicked: root.exitRequested()
                background: Rectangle {
                    implicitHeight: 60
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

            Label {
                text: qsTr("Now Playing")
                font.pixelSize: 28
                color: "#4a9eff"
            }

            Rectangle {
                Layout.fillWidth: true
                height: 1
                color: "#12203f"
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            radius: 28
            color: "#000"

            ColumnLayout {
                anchors.fill: parent
                anchors.margins: 24
                spacing: 18

                Rectangle {
                    Layout.fillWidth: true
                    Layout.preferredHeight: 640
                    radius: 22
                    color: "#05060a"
                    border.width: 1
                    border.color: "#121d38"

                    Rectangle {
                        anchors.centerIn: parent
                        width: 480
                        height: 280
                        radius: 16
                        gradient: Gradient {
                            GradientStop { position: 0.0; color: "#1a68ff" }
                            GradientStop { position: 1.0; color: "#213973" }
                        }
                        opacity: 0.72

                        ColumnLayout {
                            anchors.centerIn: parent
                            spacing: 8

                            Label {
                                text: qsTr("Player placeholder")
                                font.pixelSize: 24
                                color: "#e8efff"
                            }

                            Label {
                                text: qsTr("Video ID: ") + root.videoId
                                font.pixelSize: 20
                                color: "#cbd7f5"
                            }
                        }
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 18

                    Button {
                        text: qsTr("Play")
                        onClicked: playerController.play()
                        background: Rectangle {
                            implicitHeight: 64
                            radius: 18
                            gradient: Gradient {
                                GradientStop { position: 0.0; color: "#1a68ff" }
                                GradientStop { position: 1.0; color: "#32b0ff" }
                            }
                        }
                        contentItem: Text {
                            text: control.text
                            anchors.centerIn: parent
                            font.pixelSize: 24
                            font.bold: true
                            color: "#ffffff"
                        }
                    }

                    Button {
                        text: qsTr("Pause")
                        onClicked: playerController.pause()
                        background: Rectangle {
                            implicitHeight: 64
                            radius: 18
                            color: "#0c1326"
                            border.width: 2
                            border.color: "#20335c"
                        }
                        contentItem: Text {
                            text: control.text
                            anchors.centerIn: parent
                            font.pixelSize: 24
                            color: "#a8b5d8"
                        }
                    }

                    Button {
                        text: qsTr("Seek +30s")
                        onClicked: playerController.seek(30)
                        background: Rectangle {
                            implicitHeight: 64
                            radius: 18
                            color: "#0c1326"
                            border.width: 2
                            border.color: "#20335c"
                        }
                        contentItem: Text {
                            text: control.text
                            anchors.centerIn: parent
                            font.pixelSize: 24
                            color: "#a8b5d8"
                        }
                    }

                    Item { Layout.fillWidth: true }

                    ColumnLayout {
                        spacing: 6

                        Label {
                            id: stateLabel
                            text: qsTr("State: idle")
                            font.pixelSize: 20
                            color: "#a8b5d8"
                        }

                        Label {
                            id: progressLabel
                            text: qsTr("Progress: 0s")
                            font.pixelSize: 20
                            color: "#a8b5d8"
                        }
                    }
                }
            }
        }
    }

    Connections {
        target: playerController

        function onStateChanged(state) {
            stateLabel.text = qsTr("State: ") + state
        }

        function onProgressChanged(position) {
            progressLabel.text = qsTr("Progress: ") + position + qsTr("s")
        }

        function onErrorOccurred(message) {
            console.log("Player error", message)
        }
    }

    Component.onCompleted: {
        if (videoId.length > 0) {
            playerController.load(videoId)
        }
    }
}

