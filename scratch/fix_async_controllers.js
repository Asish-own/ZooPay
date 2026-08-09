import fs from 'fs';
import path from 'path';

const files = [
  'server/controllers/adminController.js',
  'server/controllers/buyController.js',
  'server/controllers/withdrawController.js',
  'server/controllers/userDashboardController.js',
  'server/autoPlanEngine.js'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Convert export function to export async function
  content = content.replace(/export\s+function\s+/g, 'export async function ');

  // Convert db.prepare without await to await db.prepare
  // Look for db.prepare not preceded by await
  content = content.replace(/(?<!await\s+)db\.prepare\(/g, 'await db.prepare(');

  // Safely parse count or sum properties: (await db.prepare(...).get()).count -> (await db.prepare(...).get())?.count
  content = content.replace(/\.get\(\)\.count/g, '.get())?.count || 0');
  content = content.replace(/\.get\(\)\.maxOrder/g, '.get())?.maxorder || 0');

  // Write updated file
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file} with async/await database execution.`);
}
