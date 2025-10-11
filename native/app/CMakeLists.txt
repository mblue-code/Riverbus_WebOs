cmake_minimum_required(VERSION 3.16)

set(TARGET_NAME FloatplaneNativeApp)

set(PROJECT_SOURCES
    src/FpApp.cpp
    src/FpApp.h
    src/main.cpp
    src/LoginManager.cpp
    src/LoginManager.h
    src/PlayerController.cpp
    src/PlayerController.h
    src/WebOSMediaPlayer.cpp
    src/WebOSMediaPlayer.h
    src/WebOSMediaPlayer_p.h
    src/ApiClient.cpp
    src/ApiClient.h
    src/SessionModel.cpp
    src/SessionModel.h
    src/ContentStore.cpp
    src/ContentStore.h
    src/CreatorListModel.cpp
    src/CreatorListModel.h
    src/VideoListModel.cpp
    src/VideoListModel.h
    src/PersistentCookieJar.cpp
    src/PersistentCookieJar.h
    src/WebOSMediaPlayer.cpp
    src/WebOSMediaPlayer.h
    qml/Main.qml
    qml/views/LoginView.qml
    qml/views/HomeView.qml
    qml/views/PlayerView.qml
    qml/components/VideoCard.qml
    resources/qml.qrc
    resources/images.qrc
)

find_package(QT NAMES Qt6 Qt5 COMPONENTS Quick Qml Network REQUIRED)
find_package(Qt${QT_VERSION_MAJOR} COMPONENTS Quick Qml Network REQUIRED)

find_package(PkgConfig REQUIRED)
pkg_check_modules(LUNA REQUIRED luna-service2)

qt_add_executable(${TARGET_NAME}
    ${PROJECT_SOURCES}
)

target_include_directories(${TARGET_NAME}
    PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/include
        ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_features(${TARGET_NAME} PRIVATE cxx_std_17)

target_link_libraries(${TARGET_NAME}
    PRIVATE
        Qt${QT_VERSION_MAJOR}::Quick
        Qt${QT_VERSION_MAJOR}::Qml
        Qt${QT_VERSION_MAJOR}::Network
        ${LUNA_LIBRARIES}
)

set_target_properties(${TARGET_NAME} PROPERTIES
    MACOSX_BUNDLE TRUE
    WIN32_EXECUTABLE TRUE
)

install(TARGETS ${TARGET_NAME} DESTINATION bin)

