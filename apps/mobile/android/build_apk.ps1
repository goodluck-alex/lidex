[System.Environment]::SetEnvironmentVariable("PATH", "C:\Program Files\Git\bin;C:\Program Files\Git\cmd;C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0;C:\Windows;$env:PATH", "Process")
[System.Environment]::SetEnvironmentVariable("GIT_INSTALL_ROOT", "C:\Program Files\Git", "Process")
[System.Environment]::SetEnvironmentVariable("GRADLE_USER_HOME", "D:\lidex-network\.gradle", "Process")
[System.Environment]::SetEnvironmentVariable("TMP", "D:\lidex-network\temp", "Process")
[System.Environment]::SetEnvironmentVariable("TEMP", "D:\lidex-network\temp", "Process")
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_HOME", "D:\lidex-network\android-sdk", "Process")
New-Item -ItemType Directory -Force -Path "D:\lidex-network\temp"
.\gradlew.bat assembleRelease
