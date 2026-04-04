const fs = require('fs');
const path = require('path');
const listEndpoints = require('express-list-endpoints');

const app = require('../src/app');

const endpoints = listEndpoints(app);

const outputDir = path.join(__dirname, '..', 'docs');
const outputFile = path.join(outputDir, 'routes.json');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, JSON.stringify(endpoints, null, 2), 'utf8');

console.log(`Routes saved to: ${outputFile}`);
console.log(`Total route groups: ${endpoints.length}`);