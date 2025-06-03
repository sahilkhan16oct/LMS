const fs = require('fs');
const path = require('path');

const folderPath = path.join(__dirname, 'routes');

fs.readdirSync(folderPath).forEach(file => {
  const fullPath = path.join(folderPath, file);
  const content = fs.readFileSync(fullPath, 'utf-8');

  const badRoutes = content.match(/\/:[^a-zA-Z]/g);
  if (badRoutes) {
    console.log(`❌ Possible error in: ${file} ->`, badRoutes);
  }
});
