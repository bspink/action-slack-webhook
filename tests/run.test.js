/* eslint-disable global-require */
const nock = require('nock');

const setMockInputs = (mockInputs) => {
  jest.mock('@actions/core', () => ({
    getInput: (input) => mockInputs[input],
  }));
};

const resetEnvVar = (name, value) => {
  if (value !== undefined) {
    process.env[name] = value;
  } else {
    delete process.env[name];
  }
};

describe('run', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    jest.resetModules();
  });

  describe('with no vars set', () => {
    test('should fail', async () => {
      jest.resetModules();
      setMockInputs({});
      const { run } = require('../utils');
      await expect(run()).rejects.toThrow(
        'Must declare either message or message_template_path. Failing.'
      );
    });
  });

  describe('with both message and message_template_path set', () => {
    test('should fail', async () => {
      jest.resetModules();
      setMockInputs({
        message: 'blah blah',
        message_template_path: '/some/random/path',
      });
      const { run } = require('../utils');
      await expect(run()).rejects.toThrow(
        'message and message_template_path both declared - must only set one. Failing.'
      );
    });
  });

  describe('with message set', () => {
    // TODO: invalid URL?
    test('should send to webhook successfully', async () => {
      const slackJson =
        '{"attachments":[{"color":"36a64f", "text":"hello there, your job status is success"}]}';
      jest.resetModules();
      setMockInputs({
        message: slackJson,
        slack_webhook_url: 'https://hooks.slack.com/services/blah/blah/blah',
      });
      const { run } = require('../utils');
      nock('https://hooks.slack.com:443', { encodedQueryParams: true })
        .post('/services/blah/blah/blah', {
          attachments: [
            {
              color: '36a64f',
              text: 'hello there, your job status is success',
            },
          ],
        })
        .reply(200, 'ok', ['Content-Type', 'text/html']);
      await run();
    });
  });

  describe('with message_template_path set', () => {
    // TODO: invalid URL?
    let githubWorkspace;
    let jsonVar1;
    let jsonVar2;

    beforeEach(() => {
      jest.resetModules();
      githubWorkspace = process.env.GITHUB_WORKSPACE;
      jsonVar1 = process.env.JSON_VAR_1;
      jsonVar2 = process.env.JSON_VAR_2;
      delete process.env.GITHUB_WORKSPACE;
      delete process.env.JSON_VAR_1;
      delete process.env.JSON_VAR_2;
    });
    afterEach(() => {
      resetEnvVar('GITHUB_WORKSPACE', githubWorkspace);
      resetEnvVar('JSON_VAR_1', jsonVar1);
      resetEnvVar('JSON_VAR_2', jsonVar2);
    });

    test('should send to webhook successfully', async () => {
      process.env.GITHUB_WORKSPACE = __dirname;
      process.env.JSON_VAR_1 = JSON.stringify({
        value1: 'something 1',
        value2: 'something else 1',
      });
      process.env.JSON_VAR_2 = JSON.stringify({
        value1: 'something 2',
        value2: 'something else 2',
      });

      setMockInputs({
        message_template_path: 'data/slack-template',
        slack_webhook_url: 'https://hooks.slack.com/services/blah/blah/blah',
        json_vars: 'JSON_VAR_1,JSON_VAR_2',
      });
      const { run } = require('../utils');

      nock('https://hooks.slack.com:443', { encodedQueryParams: true })
        .post('/services/blah/blah/blah', {
          text: 'something 1 something else 1 something 2 something else 2',
        })
        .reply(200, 'ok', ['Content-Type', 'text/html']);

      await run();
    });
  });
});
