# Voicepen Cypress Testing Rule

- **Running Tests**: ALWAYS use `node run_tests.js` to run Cypress tests in this project. Do not use standard Cypress CLI commands like `npx cypress run` directly.
- **Debugging Failures**: After running tests via `node run_tests.js`, if a test fails, you MUST check the `cypress-debug-output.txt` file for the detailed assertion failure logs to understand why the test failed.
