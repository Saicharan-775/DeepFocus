// scripts/verify_all.js
/**
 * Executes all verification scripts sequentially.
 */
const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  path.join(__dirname, 'verify_database.js'),
  path.join(__dirname, 'verify_rbac.js'),
  path.join(__dirname, 'verify_feature_flags.js'),
  path.join(__dirname, 'verify_backend_reliability.js'),
  // placeholder for future frontend verification
  // path.join(__dirname, 'verify_frontend.js')
];

console.log('Running verification suite...');

scripts.forEach(script => {
  console.log(`\nRunning ${path.basename(script)}`);
  try {
    execSync(`node ${script}`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`Error executing ${script}:`, e.message);
  }
});

console.log('\nAll verification scripts completed');
