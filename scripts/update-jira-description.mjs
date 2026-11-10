#!/usr/bin/env node
// Replaces the description of an existing Jira issue.
// Usage: node scripts/update-jira-description.mjs <ISSUE-KEY> "<full new description text>"
import 'dotenv/config';

const { JIRA_EMAIL, JIRA_API_TOKEN, JIRA_SITE_URL } = process.env;

const [, , issueKey, description] = process.argv;
if (!issueKey || !description) {
  console.error('Usage: node scripts/update-jira-description.mjs <ISSUE-KEY> "<full new description text>"');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

const res = await fetch(`${JIRA_SITE_URL}/rest/api/3/issue/${issueKey}`, {
  method: 'PUT',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fields: {
      description: {
        type: 'doc',
        version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
      },
    },
  }),
});

if (!res.ok) {
  const data = await res.json().catch(() => ({}));
  console.error('Failed to update description:', JSON.stringify(data, null, 2));
  process.exit(1);
}
console.log(`Updated description on ${issueKey}`);
