const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,

  e2e: {
    baseUrl: 'http://localhost:3000',
    experimentalRunAllSpecs: true,
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium' && browser.name !== 'electron') {
          launchOptions.args.push('--no-sandbox');
        }
        return launchOptions;
      });
    },
  },
});

