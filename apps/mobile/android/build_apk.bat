@echo off
set PATH=C:\Program Files\Git\bin;C:\Program Files\Git\cmd;C:\Program Files\Git\usr\bin;D:\flutter\bin;%PATH%
set GIT_INSTALL_ROOT=C:\Program Files\Git
set FLUTTER_ROOT=D:\flutter
cd ..
call flutter build apk --release
