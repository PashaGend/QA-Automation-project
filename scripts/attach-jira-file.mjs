#!/usr/bin/env node
// Attaches a file to an existing Jira issue.
// Usage: node scripts/attach-jira-file.mjs <ISSUE-KEY> <path/to/file>
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const { JIRA_EMAIL, JIRA_API_TOKEN, JIRA_SITE_URL } = process.env;

const [, , issueKey, filePath] = process.argv;
if (!issueKey || !filePath) {
  console.error('Usage: node scripts/attach-jira-file.mjs <ISSUE-KEY> <path/to/file>');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const fileBuffer = await readFile(filePath);

const form = new FormData();
form.append('file', new Blob([fileBuffer]), basename(filePath));

const res = await fetch(`${JIRA_SITE_URL}/rest/api/3/issue/${issueKey}/attachments`, {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'X-Atlassian-Token': 'no-check',
  },
  body: form,
});

const data = await res.json();
if (!res.ok) {
  console.error('Failed to attach file:', JSON.stringify(data, null, 2));
  process.exit(1);
}
console.log(`Attached ${basename(filePath)} to ${issueKey}`);
