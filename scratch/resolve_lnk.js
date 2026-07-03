const { execSync } = require('child_process');
try {
  const code = `
    $sh = New-Object -ComObject WScript.Shell
    $lnk = $sh.CreateShortcut("d:\\\\MockMate\\\\.env.local - Shortcut.lnk")
    Write-Output $lnk.TargetPath
  `;
  const result = execSync(`powershell -Command "${code.trim().replace(/\n/g, '; ')}"`);
  console.log('Target path:', result.toString().trim());
} catch (err) {
  console.error('Error resolving shortcut:', err.message);
}
