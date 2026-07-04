const { execSync } = require('child_process');
const fs = require('fs');
try {
  const specArg = process.argv[2] ? `--spec "${process.argv[2]}"` : '';
  const cmd = `npx start-server-and-test serve http://127.0.0.1:5500 "npx cypress run ${specArg}"`;
  console.log('Running: ' + cmd);
  const out = execSync(cmd, { encoding: 'utf-8', env: {...process.env, ELECTRON_EXTRA_LAUNCH_ARGS: '--no-sandbox'} });
  fs.writeFileSync('cypress-debug-output.txt', out);
  console.log('✅ Tests passed successfully! Output saved to cypress-debug-output.txt');
} catch (e) {
  fs.writeFileSync('cypress-debug-output.txt', (e.stdout || '') + '\n' + (e.stderr || ''));
  console.error('❌ Tests failed. See cypress-debug-output.txt for details.');
}
