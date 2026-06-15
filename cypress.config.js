const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,
  // ตั้งค่า Default Viewport เป็นขนาดมือถือ (iPhone XR: 414x896)
  viewportWidth: 414,
  viewportHeight: 896,

  e2e: {
    // ตั้งค่า URL หลัก (สำคัญมาก! เพื่อให้คำสั่ง cy.visit('/index.html') ทำงานได้)
    baseUrl: 'http://127.0.0.1:5500',
    experimentalRunAllSpecs: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
