if(NOT DEFINED ENV{WEBOS_SDK_HOME})
    message(FATAL_ERROR "WEBOS_SDK_HOME environment variable is not set. Please source the webOS SDK environment setup script.")
endif()

set(WEBOS_SDK_HOME $ENV{WEBOS_SDK_HOME})

set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(TOOLCHAIN_PREFIX "${WEBOS_SDK_HOME}/CLI/bin")
set(SYSROOT "${WEBOS_SDK_HOME}/CLI/sysroot/prjroot")

set(CMAKE_C_COMPILER "${TOOLCHAIN_PREFIX}/arm-webos-linux-gnueabi-gcc")
set(CMAKE_CXX_COMPILER "${TOOLCHAIN_PREFIX}/arm-webos-linux-gnueabi-g++")
set(CMAKE_FIND_ROOT_PATH "${SYSROOT}")

set(CMAKE_SYSROOT "${SYSROOT}")

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)

set(QT_HOST_PATH $ENV{QT_HOST_PATH})
if(NOT QT_HOST_PATH)
    message(WARNING "QT_HOST_PATH not defined. Qt host tools may not be found automatically.")
endif()

set(QT_TARGET_PATH $ENV{QT_TARGET_PATH})
if(NOT QT_TARGET_PATH)
    message(FATAL_ERROR "QT_TARGET_PATH environment variable must point to the Qt target sysroot.")
endif()

list(APPEND CMAKE_PREFIX_PATH "${QT_TARGET_PATH}")

set(ENV{PKG_CONFIG_PATH} "${QT_TARGET_PATH}/lib/pkgconfig:$ENV{PKG_CONFIG_PATH}")

