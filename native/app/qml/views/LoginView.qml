import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

FocusScope {
    id: root
    width: 1920
    height: 1080

    signal loginSuccess()

    property bool waitingForFactor: false
    property bool busy: false
    property string errorMessage: ""

    Keys.forwardTo: [emailField, passwordField, tokenField]

    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: "#070b18" }
            GradientStop { position: 0.6; color: "#04060a" }
            GradientStop { position: 1.0; color: "#05060a" }
        }
        opacity: 0.85
    }

    ColumnLayout {
        anchors.fill: parent
        anchors.margins: 72
        spacing: 48

        RowLayout {
            spacing: 32

            Rectangle {
                width: 120
                height: 120
                radius: 24
                color: "#0c1528"
                border.color: "#4a9eff"
                border.width: 2

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
                    text: qsTr("Floatplane TV")
                    font.pixelSize: 48
                    font.bold: true
                    color: "#f5f7ff"
                }

                Label {
                    text: qsTr("Sign in with your Floatplane account to continue.")
                    font.pixelSize: 22
                    color: "#a8b5d8"
                }
            }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 640
            radius: 28
            color: "#0b1327"
            border.color: "#18274b"
            border.width: 1
            opacity: 0.92

            RowLayout {
                anchors.fill: parent
                anchors.margins: 48
                spacing: 64

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 28

                    Label {
                        text: qsTr("Account")
                        font.pixelSize: 32
                        font.bold: true
                        color: "#f5f7ff"
                    }

                    TextField {
                        id: emailField
                        Layout.preferredWidth: 620
                        placeholderText: qsTr("Email address")
                        font.pixelSize: 26
                        color: "#f5f7ff"
                        background: Rectangle {
                            radius: 18
                            color: "#0f1a33"
                            border.width: 2
                            border.color: control.activeFocus ? "#4a9eff" : "#1a2746"
                        }
                        focus: true
                        Keys.onReturnPressed: passwordField.forceActiveFocus()
                    }

                    TextField {
                        id: passwordField
                        Layout.preferredWidth: 620
                        placeholderText: qsTr("Password")
                        echoMode: TextInput.Password
                        font.pixelSize: 26
                        color: "#f5f7ff"
                        background: Rectangle {
                            radius: 18
                            color: "#0f1a33"
                            border.width: 2
                            border.color: control.activeFocus ? "#4a9eff" : "#1a2746"
                        }
                        Keys.onReturnPressed: attemptLogin()
                    }

                    Item {
                        Layout.preferredWidth: 620
                        Layout.preferredHeight: waitingForFactor ? 0 : 1
                    }

                    TextField {
                        id: tokenField
                        visible: waitingForFactor
                        Layout.preferredWidth: 380
                        placeholderText: qsTr("Verification code")
                        font.pixelSize: 26
                        color: "#f5f7ff"
                        background: Rectangle {
                            radius: 18
                            color: "#0f1a33"
                            border.width: 2
                            border.color: control.activeFocus ? "#4a9eff" : "#1a2746"
                        }
                        Keys.onReturnPressed: submitFactor()
                    }

                    RowLayout {
                        spacing: 24

                        Button {
                            id: primaryButton
                            text: waitingForFactor ? qsTr("Submit Code") : qsTr("Sign In")
                            enabled: !busy
                            Layout.preferredWidth: 240
                            font.pixelSize: 26
                            focus: !waitingForFactor
                            Keys.onReturnPressed: clicked()
                            background: Rectangle {
                                implicitHeight: 72
                                radius: 18
                                gradient: Gradient {
                                    GradientStop { position: 0.0; color: "#1a68ff" }
                                    GradientStop { position: 1.0; color: "#32b0ff" }
                                }
                                border.width: 0
                            }
                            contentItem: Text {
                                text: control.text
                                anchors.centerIn: parent
                                font.pixelSize: 26
                                font.bold: true
                                color: "#ffffff"
                                renderType: Text.NativeRendering
                            }
                            onClicked: {
                                if (waitingForFactor) {
                                    submitFactor()
                                } else {
                                    attemptLogin()
                                }
                            }
                        }

                        Button {
                            text: qsTr("Use Sample Data")
                            Layout.preferredWidth: 260
                            enabled: !busy
                            background: Rectangle {
                                implicitHeight: 72
                                radius: 18
                                color: "#0f1a33"
                                border.width: 2
                                border.color: "#283b6d"
                            }
                            contentItem: Text {
                                text: control.text
                                anchors.centerIn: parent
                                font.pixelSize: 24
                                color: "#a8b5d8"
                            }
                            onClicked: {
                                loginManager.useSampleMode()
                            }
                        }
                    }

                    ColumnLayout {
                        spacing: 12

                        Label {
                            visible: busy
                            text: qsTr("Authenticating…")
                            font.pixelSize: 22
                            color: "#4a9eff"
                        }

                        Label {
                            visible: errorMessage.length > 0
                            text: errorMessage
                            font.pixelSize: 22
                            color: "#ff8a8a"
                            wrapMode: Text.Wrap
                        }
                    }
                }

                Rectangle {
                    Layout.preferredWidth: 520
                    Layout.fillHeight: true
                    radius: 20
                    color: "#0f162c"
                    border.color: "#21345d"
                    border.width: 1

                    ColumnLayout {
                        anchors.fill: parent
                        anchors.margins: 36
                        spacing: 24

                        Label {
                            text: qsTr("Tips")
                            font.pixelSize: 30
                            font.bold: true
                            color: "#f5f7ff"
                        }

                        Repeater {
                            model: [
                                qsTr("LG remote OK confirms or submits forms."),
                                qsTr("Menu key opens webOS system options."),
                                qsTr("Focus indicators glow blue when selectable."),
                                qsTr("Use Sample Data to explore without logging in.")
                            ]

                            delegate: Label {
                                wrapMode: Text.Wrap
                                text: "• " + modelData
                                font.pixelSize: 22
                                color: "#a8b5d8"
                            }
                        }

                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 1
                            color: "#1d2a49"
                        }

                        Label {
                            text: qsTr("Need help?")
                            font.pixelSize: 24
                            font.bold: true
                            color: "#4a9eff"
                        }

                        Label {
                            text: qsTr("Open the Floatplane app on desktop to manage devices or reset your password.")
                            wrapMode: Text.Wrap
                            font.pixelSize: 22
                            color: "#a8b5d8"
                        }
                    }
                }
            }
        }
    }

    function attemptLogin() {
        errorMessage = ""
        waitingForFactor = false
        busy = true
        loginManager.login(emailField.text, passwordField.text)
    }

    function submitFactor() {
        errorMessage = ""
        busy = true
        loginManager.factor(tokenField.text)
    }

    Connections {
        target: loginManager

        function onFactorRequired() {
            busy = false
            waitingForFactor = true
            tokenField.forceActiveFocus()
        }

        function onLoginSucceeded() {
            busy = false
            waitingForFactor = false
            root.loginSuccess()
        }

        function onLoginFailed(error) {
            busy = false
            waitingForFactor = false
            errorMessage = error
        }

        function onSampleModeActivated() {
            busy = false
            waitingForFactor = false
            root.loginSuccess()
        }
    }

    Component.onCompleted: emailField.forceActiveFocus()
}

