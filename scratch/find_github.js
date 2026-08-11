const fs = require('fs');
const path = 'd:/MockMate/node_modules/lucide-react/dist/lucide-react.d.ts';
if (fs.existsSync(path)) {
  const content = fs.readFileSync(path, 'utf8');
  console.log(content.substring(0, 1000));
} else {
  console.log("File not found:", path);
}
