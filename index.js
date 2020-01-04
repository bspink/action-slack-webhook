const core = require('@actions/core');
const github = require('@actions/github');
const _ = require('lodash');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const run = async () => {
  // Use custom delimiters for data/vars, e.g. {{ var }}
  // See https://lodash.com/docs/4.17.11#template
  _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

  console.log(`GITHUB_WORKSPACE = ${process.env.GITHUB_WORKSPACE}`);
  console.log(`process.cwd() = ${process.cwd()}`);

  // INPUT_MESSAGE
  // INPUT_MESSAGE_TEMPLATE_PATH
  // `message` and `message_template_path` inputs defined in action metadata file
  const message = core.getInput('message');
  const messageTemplatePath = core.getInput('message_template_path');
  const { SLACK_WEBHOOK_URL: slackWebhookUrl } = process.env;
  // Get the JSON webhook payload for the event that triggered the workflow
  const {
    context: { payload: githubPayload },
  } = github;

  if (message && messageTemplatePath) {
    throw Error(
      'message and message_template_path both declared - must only set one. Failing.'
    );
  }
  if (!message && !messageTemplatePath) {
    throw Error(
      'Must declare either message or message_template_path. Failing.'
    );
  }

  let templateString;

  if (messageTemplatePath) {
    templateString = fs.readFileSync(
      path.join(process.env.GITHUB_WORKSPACE, messageTemplatePath)
    );
  } else {
    templateString = message;
  }

  const slackPayload = _.template(templateString)({
    ...process.env,
    event: githubPayload,
  });

  await axios({
    method: 'post',
    url: slackWebhookUrl,
    data: slackPayload,
  });
};

(async () => {
  try {
    await run();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
