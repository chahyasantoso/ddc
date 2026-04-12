const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database(path.join('.db', 'journal.db'));

// Get all checkpoints
const checkpoints = db.prepare('SELECT * FROM checkpoints').all();
// Get all photos
const photos = db.prepare('SELECT * FROM photos').all();

let sql = '-- Data export\n';

for (const cp of checkpoints) {
  sql += `INSERT INTO checkpoints (id, location_name, lat, lng, description, created_at) VALUES (${cp.id}, '${cp.location_name.replace(/'/g, "''")}', ${cp.lat}, ${cp.lng}, ${cp.description ? `'${cp.description.replace(/'/g, "''")}'` : 'NULL'}, '${cp.created_at}');\n`;
}

for (const p of photos) {
  sql += `INSERT INTO photos (id, checkpoint_id, photo_url, caption, "order", created_at) VALUES (${p.id}, ${p.checkpoint_id}, '${p.photo_url.replace(/'/g, "''")}', '${p.caption.replace(/'/g, "''")}', ${p.order}, '${p.created_at}');\n`;
}

fs.writeFileSync(path.join('db', 'current_data.sql'), sql);
console.log('Exported data to db/current_data.sql');
db.close();
