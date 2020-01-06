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

  // Inputs defined in action metadata file
  const message = core.getInput('message');
  const messageTemplatePath = core.getInput('message_template_path');
  const slackWebhookUrl = core.getInput('slack_webhook_url');
  const jsonVars = core.getInput('json_vars');

  // Get the JSON webhook payload for the event that triggered the workflow
  const {
    context: { payload: githubPayload },
  } = github;

  if (!message && !messageTemplatePath) {
    throw Error(
      'Must declare either message or message_template_path. Failing.'
    );
  }

  if (message && messageTemplatePath) {
    throw Error(
      'message and message_template_path both declared - must only set one. Failing.'
    );
  }

  const templateString =
    message ||
    fs.readFileSync(
      path.join(process.env.GITHUB_WORKSPACE, messageTemplatePath)
    );

  const jsonVarMap = jsonVars
    ? jsonVars.split(',').reduce(
        (vars, varName) => ({
          ...vars,
          [varName]: JSON.parse(process.env[varName]),
        }),
        {}
      )
    : {};

  const slackPayload = _.template(templateString)({
    ...process.env,
    event: githubPayload,
    ...jsonVarMap,
  });

  console.log(`slack payload = ${slackPayload}`);
  await axios({
    method: 'post',
    url: slackWebhookUrl,
    data: slackPayload,
  });
};

module.exports = { run };
