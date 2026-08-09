import fs from 'fs';

const files = [
  'server/controllers/adminController.js',
  'server/controllers/buyController.js',
  'server/controllers/withdrawController.js',
  'server/controllers/userDashboardController.js',
  'server/autoPlanEngine.js'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix extra closing parenthesis: .get())?. -> .get())?. or .get())
  content = content.replace(/\.get\(\)\)\?\./g, '.get())?.');
  content = content.replace(/\.get\(\)\)\?/g, '.get())?');

  // Replace await inside non-async arrow functions inside transaction
  // Ensure db.transaction receives async () => { ... }
  content = content.replace(/db\.transaction\(\(\) =>/g, 'db.transaction(async () =>');

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Syntax cleanup script complete.');
