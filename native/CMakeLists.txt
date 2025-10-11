cmake_minimum_required(VERSION 3.16)

project(FloatplaneNative LANGUAGES CXX)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

if(NOT CMAKE_TOOLCHAIN_FILE AND DEFINED ENV{WEBOS_SDK_HOME})
    set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_LIST_DIR}/toolchain/webos.cmake" CACHE FILEPATH "" FORCE)
endif()

add_subdirectory(app)

