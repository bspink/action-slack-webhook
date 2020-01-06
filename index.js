const core = require('@actions/core');
const { run } = require('./utils');

(async () => {
  try {
    await run();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
