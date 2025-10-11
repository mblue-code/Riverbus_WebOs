#include <QGuiApplication>
#include <QQmlApplicationEngine>

#include "FpApp.h"

int main(int argc, char *argv[])
{
    QGuiApplication app(argc, argv);

    FpApp fpApp;
    fpApp.initialize();

    return app.exec();
}

