#!/usr/bin/env node
// Adds a comment to an existing Jira issue.
// Usage: node scripts/comment-jira.mjs <ISSUE-KEY> "<comment text>"
import 'dotenv/config';

const { JIRA_EMAIL, JIRA_API_TOKEN, JIRA_SITE_URL } = process.env;

const [, , issueKey, comment] = process.argv;
if (!issueKey || !comment) {
  console.error('Usage: node scripts/comment-jira.mjs <ISSUE-KEY> "<comment text>"');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

const res = await fetch(`${JIRA_SITE_URL}/rest/api/3/issue/${issueKey}/comment`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    body: {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: comment }] }],
    },
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error('Failed to add comment:', JSON.stringify(data, null, 2));
  process.exit(1);
}
console.log(`Commented on ${issueKey}`);
