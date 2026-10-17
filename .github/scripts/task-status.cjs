// Keeps issue status labels in sync with assignment, pull requests and dependencies.
// Run by .github/workflows/task-status.yml via actions/github-script. Rules: docs/TEAM.md.

const STATUS = {
  ready: 'status:ready',
  inProgress: 'status:in-progress',
  review: 'status:review',
  blocked: 'status:blocked',
};
const ALL_STATUS = Object.values(STATUS);

/** Issue numbers listed on the "Phụ thuộc:" line of an issue body. */
function parseDependencies(body) {
  const line = (body ?? '').split('\n').find((l) => /^\s*\**\s*Phụ thuộc\s*\**\s*:/i.test(l));
  if (!line) return [];
  return [...line.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
}

/** Issues a pull request closes ("Closes #12", "Fixes #3", "Resolves #4"). */
function parseClosingRefs(body) {
  const refs = [...(body ?? '').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi)];
  return [...new Set(refs.map((m) => Number(m[1])))];
}

/** Labels to set on an issue: drop every status label, then add the new one (if any). */
function withStatus(labels, status) {
  const kept = labels.filter((l) => !ALL_STATUS.includes(l));
  return status ? [...kept, status] : kept;
}

async function setStatus(github, repo, issueNumber, status) {
  const { data: issue } = await github.rest.issues.get({ ...repo, issue_number: issueNumber });
  if (issue.pull_request || issue.state === 'closed') return;
  const current = issue.labels.map((l) => (typeof l === 'string' ? l : l.name));
  const next = withStatus(current, status);
  if (next.join() === current.join()) return;
  await github.rest.issues.setLabels({ ...repo, issue_number: issueNumber, labels: next });
}

async function openDependencies(github, repo, body) {
  const open = [];
  for (const n of parseDependencies(body)) {
    const { data } = await github.rest.issues.get({ ...repo, issue_number: n });
    if (data.state === 'open') open.push(n);
  }
  return open;
}

/** Status for an issue that nobody works on: blocked while a dependency is open. */
async function idleStatus(github, repo, issue) {
  return (await openDependencies(github, repo, issue.body)).length ? STATUS.blocked : STATUS.ready;
}

async function run({ github, context }) {
  const repo = context.repo;
  const { eventName, payload } = context;

  if (eventName === 'issues') {
    const issue = payload.issue;
    switch (payload.action) {
      case 'assigned':
        return setStatus(github, repo, issue.number, STATUS.inProgress);
      case 'unassigned':
        if (issue.assignees.length === 0) {
          return setStatus(github, repo, issue.number, await idleStatus(github, repo, issue));
        }
        return;
      case 'opened':
      case 'reopened':
        if (issue.assignees.length === 0) {
          return setStatus(github, repo, issue.number, await idleStatus(github, repo, issue));
        }
        return;
      case 'closed':
        await github.rest.issues.setLabels({
          ...repo,
          issue_number: issue.number,
          labels: withStatus(
            issue.labels.map((l) => l.name),
            null,
          ),
        });
        return unblockDependents(github, repo, issue.number);
    }
  }

  if (eventName === 'pull_request') {
    const pr = payload.pull_request;
    const refs = parseClosingRefs(pr.body);
    const open = ['opened', 'reopened', 'ready_for_review', 'edited'].includes(payload.action);
    for (const n of refs) {
      if (open && !pr.draft) await setStatus(github, repo, n, STATUS.review);
      if (payload.action === 'converted_to_draft')
        await setStatus(github, repo, n, STATUS.inProgress);
      if (payload.action === 'closed' && !pr.merged)
        await setStatus(github, repo, n, STATUS.inProgress);
    }
  }
}

/** When an issue closes, mark blocked issues whose dependencies are now all closed as ready. */
async function unblockDependents(github, repo, closedNumber) {
  const blocked = await github.paginate(github.rest.issues.listForRepo, {
    ...repo,
    state: 'open',
    labels: STATUS.blocked,
    per_page: 100,
  });
  for (const issue of blocked) {
    if (issue.pull_request || !parseDependencies(issue.body).includes(closedNumber)) continue;
    if ((await openDependencies(github, repo, issue.body)).length) continue;
    await setStatus(github, repo, issue.number, STATUS.ready);
    await github.rest.issues.createComment({
      ...repo,
      issue_number: issue.number,
      body: `🔓 Đã mở khoá: mọi việc phụ thuộc đã xong (vừa đóng #${closedNumber}). Có thể nhận việc bằng \`/claim-task ${issue.number}\`.`,
    });
  }
}

module.exports = { run, parseDependencies, parseClosingRefs, withStatus, STATUS };
