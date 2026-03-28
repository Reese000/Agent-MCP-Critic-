Set shell = CreateObject("WScript.Shell")
' Get the current directory of the script
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
' Build path to the batch file - handle spaces by quoting
batPath = Chr(34) & strPath & "\start_monitor.bat" & Chr(34)
' Run cmd.exe /k to keep the window open. '1' means visible window, 'False' means don't wait for it to exit
shell.Run "cmd.exe /k " & batPath, 1, False
