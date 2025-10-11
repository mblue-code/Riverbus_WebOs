import QtQuick 2.15
import QtQuick.Controls 2.15

ApplicationWindow {
    id: root
    width: 1920
    height: 1080
    visible: true
    title: qsTr("Floatplane Native")
    color: "#05060a"

    property bool isAuthenticated: false

    Connections {
        target: sessionModel
        function onAuthenticatedChanged() {
            isAuthenticated = sessionModel.authenticated
            if (isAuthenticated) {
                stack.replace(homeView)
            }
        }
    }

    Image {
        anchors.fill: parent
        source: "qrc:/images/bg.png"
        fillMode: Image.PreserveAspectCrop
        opacity: 0.35
    }

    StackView {
        id: stack
        anchors.fill: parent
        initialItem: loginView
    }

    Component {
        id: loginView

        LoginView {
            onLoginSuccess: {
                root.isAuthenticated = true
                stack.replace(homeView)
            }
        }
    }

    Component {
        id: homeView

        HomeView {
            Component.onCompleted: contentStore.refreshSubscriptions()
            onOpenVideoRequested: function(videoId) {
                playerView.videoId = videoId
                stack.push(playerViewComponent)
            }
        }
    }

    Component {
        id: playerViewComponent

        PlayerView {
            id: playerView
            onExitRequested: stack.pop()
        }
    }
}

