$sh = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut("d:\MockMate\.env.local - Shortcut.lnk")
Write-Output $lnk.TargetPath
