// node --test .github/scripts/
const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  parseClosingRefs,
  parseDependencies,
  run,
  withStatus,
  STATUS,
} = require('./task-status.cjs');

test('parseDependencies reads the "Phụ thuộc" line only', () => {
  const body = 'Xem #9 trong mô tả.\n**Phụ thuộc:** #4, #7\nLiên quan #12';
  assert.deepEqual(parseDependencies(body), [4, 7]);
  assert.deepEqual(parseDependencies('Phụ thuộc: không có'), []);
  assert.deepEqual(parseDependencies(undefined), []);
});

test('parseClosingRefs finds closing keywords', () => {
  assert.deepEqual(parseClosingRefs('Closes #4, fixes #7 và resolves #4. Xem #9.'), [4, 7]);
  assert.deepEqual(parseClosingRefs(null), []);
});

test('withStatus replaces only status labels', () => {
  assert.deepEqual(withStatus(['area:web', STATUS.ready], STATUS.inProgress), [
    'area:web',
    STATUS.inProgress,
  ]);
  assert.deepEqual(withStatus(['P0', STATUS.review], null), ['P0']);
});

function fakeGithub(issues) {
  const calls = [];
  const get = async ({ issue_number }) => ({ data: issues[issue_number] });
  const github = {
    paginate: async (_fn, { labels }) =>
      Object.values(issues).filter(
        (i) => i.state === 'open' && i.labels.some((l) => l.name === labels),
      ),
    rest: {
      issues: {
        get,
        listForRepo: () => {},
        setLabels: async (args) => {
          calls.push(['setLabels', args.issue_number, args.labels]);
          issues[args.issue_number].labels = args.labels.map((name) => ({ name }));
        },
        createComment: async (args) => calls.push(['comment', args.issue_number]),
      },
    },
  };
  return { github, calls };
}
const repo = { owner: 'o', repo: 'r' };
const issue = (number, extra = {}) => ({
  number,
  state: 'open',
  body: '',
  labels: [],
  assignees: [],
  ...extra,
});

test('assigning an issue marks it in progress', async () => {
  const issues = { 5: issue(5, { labels: [{ name: STATUS.ready }, { name: 'area:web' }] }) };
  const { github, calls } = fakeGithub(issues);
  await run({
    github,
    context: { repo, eventName: 'issues', payload: { action: 'assigned', issue: issues[5] } },
  });
  assert.deepEqual(calls, [['setLabels', 5, ['area:web', STATUS.inProgress]]]);
});

test('unassigning returns an issue to ready, or blocked while a dependency is open', async () => {
  const issues = {
    4: issue(4),
    6: issue(6, { body: 'Phụ thuộc: #4', labels: [{ name: STATUS.inProgress }] }),
    7: issue(7, { labels: [{ name: STATUS.inProgress }] }),
  };
  const { github, calls } = fakeGithub(issues);
  for (const n of [6, 7]) {
    await run({
      github,
      context: { repo, eventName: 'issues', payload: { action: 'unassigned', issue: issues[n] } },
    });
  }
  assert.deepEqual(calls, [
    ['setLabels', 6, [STATUS.blocked]],
    ['setLabels', 7, [STATUS.ready]],
  ]);
});

test('closing an issue unblocks dependents whose dependencies are all closed', async () => {
  const issues = {
    4: issue(4, { state: 'closed', labels: [{ name: STATUS.review }] }),
    7: issue(7),
    8: issue(8, { body: 'Phụ thuộc: #4', labels: [{ name: STATUS.blocked }] }),
    9: issue(9, { body: 'Phụ thuộc: #4, #7', labels: [{ name: STATUS.blocked }] }),
  };
  const { github, calls } = fakeGithub(issues);
  await run({
    github,
    context: { repo, eventName: 'issues', payload: { action: 'closed', issue: issues[4] } },
  });
  assert.deepEqual(calls, [
    ['setLabels', 4, []],
    ['setLabels', 8, [STATUS.ready]],
    ['comment', 8],
  ]);
});

test('a ready pull request moves its issues to review; closing unmerged moves them back', async () => {
  const issues = { 4: issue(4, { labels: [{ name: STATUS.inProgress }] }) };
  const { github, calls } = fakeGithub(issues);
  const pr = { body: 'Closes #4', draft: false, merged: false };
  await run({
    github,
    context: { repo, eventName: 'pull_request', payload: { action: 'opened', pull_request: pr } },
  });
  await run({
    github,
    context: { repo, eventName: 'pull_request', payload: { action: 'closed', pull_request: pr } },
  });
  assert.deepEqual(calls, [
    ['setLabels', 4, [STATUS.review]],
    ['setLabels', 4, [STATUS.inProgress]],
  ]);
});

test('a draft pull request leaves the issue in progress', async () => {
  const issues = { 4: issue(4, { labels: [{ name: STATUS.inProgress }] }) };
  const { github, calls } = fakeGithub(issues);
  const pr = { body: 'Closes #4', draft: true, merged: false };
  await run({
    github,
    context: { repo, eventName: 'pull_request', payload: { action: 'opened', pull_request: pr } },
  });
  assert.deepEqual(calls, []);
});
