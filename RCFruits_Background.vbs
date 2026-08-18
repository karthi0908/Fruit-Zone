Set Shell = CreateObject("WScript.Shell")
Shell.CurrentDirectory = "D:\project for bala"
Shell.Run "java -jar target\tracker-0.0.1-SNAPSHOT.jar", 0, False
