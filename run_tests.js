const { execSync } = require('child_process');
const fs = require('fs');
try {
  const out = execSync('npx start-server-and-test serve http://127.0.0.1:5500 "npx cypress run --spec cypress/e2e/14-extra-cost.cy.js"', { encoding: 'utf-8', env: {...process.env, ELECTRON_EXTRA_LAUNCH_ARGS: '--no-sandbox'} });
  fs.writeFileSync('cypress-debug-output.txt', out);
} catch (e) {
  fs.writeFileSync('cypress-debug-output.txt', (e.stdout || '') + '\n' + (e.stderr || ''));
}
