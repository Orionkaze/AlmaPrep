const fs = require('fs');
try {
  let content = fs.readFileSync('d:/MockMate/scratch/audit.json', 'utf16le');
  if (content.startsWith('\uFEFF')) {
    content = content.slice(1);
  }
  const data = JSON.parse(content);
  const advisories = data.advisories || {};
  const packageMap = new Map();
  for (const id in advisories) {
    const adv = advisories[id];
    const pkg = adv.module_name;
    const sev = adv.severity;
    const patched = adv.patched_versions;
    if (!packageMap.has(pkg)) {
      packageMap.set(pkg, { severity: sev, patched });
    }
  }
  console.log("Vulnerable Packages Summary:");
  packageMap.forEach((info, pkg) => {
    console.log(`- ${pkg}: Severity=${info.severity}, Patched=${info.patched}`);
  });
} catch (e) {
  console.error("Error parsing audit.json:", e);
}
