const fs = require('fs');
const path = require('path');

const rarPath = path.join(__dirname, '..', '.env.rar');
if (fs.existsSync(rarPath)) {
  const buffer = fs.readFileSync(rarPath);
  console.log('Magic bytes:', buffer.slice(0, 4).toString());
  console.log('Hex bytes:', buffer.slice(0, 10).toString('hex'));
} else {
  console.log('File .env.rar not found');
}
