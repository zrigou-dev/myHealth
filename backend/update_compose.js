const fs = require('fs');
const path = require('path');

const composePath = path.join(__dirname, 'docker-compose.yml');
let content = fs.readFileSync(composePath, 'utf8');

content = content.replace(/POSTGRES_USER:\s*postgres/g, 'POSTGRES_USER: ${POSTGRES_USER:-postgres}');
content = content.replace(/POSTGRES_PASSWORD:\s*postgres/g, 'POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}');
content = content.replace(/DB_USER:\s*postgres/g, 'DB_USER: ${POSTGRES_USER:-postgres}');
content = content.replace(/DB_PASSWORD:\s*postgres/g, 'DB_PASSWORD: ${POSTGRES_PASSWORD:-postgres}');

content = content.replace(/- DB_USER=postgres/g, '- DB_USER=${POSTGRES_USER:-postgres}');
content = content.replace(/- DB_PASSWORD=postgres/g, '- DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}');
content = content.replace(/- POSTGRES_USER=postgres/g, '- POSTGRES_USER=${POSTGRES_USER:-postgres}');
content = content.replace(/- POSTGRES_PASSWORD=postgres/g, '- POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}');

content = content.replace(/your_super_secret_jwt_key_change_this_in_production_12345/g, '${JWT_SECRET:-your_super_secret_jwt_key_change_this_in_production_12345}');

fs.writeFileSync(composePath, content);
console.log('docker-compose.yml updated successfully.');
