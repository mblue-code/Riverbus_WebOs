import QtQuick 2.15
import QtQuick.Controls 2.15

Item {
    id: root
    width: 320
    height: 240

    property alias title: titleLabel.text
    property string duration: ""
    property string badge: ""
    property bool focused: false

    signal activated()

    Keys.onReturnPressed: activated()

    Rectangle {
        anchors.fill: parent
        radius: 22
        color: root.focused ? "#1b2b50" : "#0f162c"
        border.width: root.focused ? 2 : 1
        border.color: root.focused ? "#4a9eff" : "#172749"
        Behavior on color { ColorAnimation { duration: 120 } }

        Column {
            anchors.fill: parent
            anchors.margins: 18
            spacing: 12

            Rectangle {
                width: parent.width
                height: 150
                radius: 18
                gradient: Gradient {
                    GradientStop { position: 0.0; color: "#1a68ff" }
                    GradientStop { position: 1.0; color: "#213973" }
                }
                opacity: 0.78

                Text {
                    anchors.centerIn: parent
                    text: qsTr("Preview")
                    font.pixelSize: 22
                    color: "#dce6ff"
                }
            }

            Text {
                id: titleLabel
                text: qsTr("Video Title")
                color: "#f5f7ff"
                font.pixelSize: 22
                wrapMode: Text.Wrap
            }

            Row {
                spacing: 12

                Text {
                    text: root.duration
                    color: "#a8b5d8"
                    font.pixelSize: 18
                }

                Rectangle {
                    width: 1
                    height: 18
                    color: "#1d2a49"
                }

                Text {
                    text: root.badge
                    color: "#4a9eff"
                    font.pixelSize: 18
                }
            }
        }
    }
}

