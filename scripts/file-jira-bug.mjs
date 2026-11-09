#!/usr/bin/env node
// Files a bug in Jira. Credentials come from .env (gitignored, local only —
// never committed). Usage: node scripts/file-jira-bug.mjs "<title>" "<description>"
import 'dotenv/config';

const { JIRA_EMAIL, JIRA_API_TOKEN, JIRA_SITE_URL, JIRA_PROJECT_KEY } = process.env;

const [, , title, description] = process.argv;
if (!title || !description) {
  console.error('Usage: node scripts/file-jira-bug.mjs "<title>" "<description>"');
  process.exit(1);
}

if (!JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_SITE_URL || !JIRA_PROJECT_KEY) {
  console.error('Missing JIRA_EMAIL / JIRA_API_TOKEN / JIRA_SITE_URL / JIRA_PROJECT_KEY in .env');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

const res = await fetch(`${JIRA_SITE_URL}/rest/api/3/issue`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: title,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: description }],
          },
        ],
      },
      issuetype: { name: 'Bug' },
    },
  }),
});

const data = await res.json();
if (!res.ok) {
  console.error('Failed to create issue:', JSON.stringify(data, null, 2));
  process.exit(1);
}
console.log(`Created: ${JIRA_SITE_URL}/browse/${data.key}`);
