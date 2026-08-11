const fs = require('fs');
const path = 'd:/MockMate/node_modules/lucide-react/dist/lucide-react.d.ts';
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf8');
  const regex = /@name\s+(\w+)/g;
  let match;
  const icons = [];
  while ((match = regex.exec(content)) !== null) {
    icons.push(match[1]);
  }
  console.log("Twitter icons:", icons.filter(name => name.toLowerCase().includes('twitter')));
  console.log("Facebook icons:", icons.filter(name => name.toLowerCase().includes('facebook')));
  console.log("Git icons starting with Git:", icons.filter(name => name.startsWith('Git')));
} else {
  console.log("File not found:", path);
}
