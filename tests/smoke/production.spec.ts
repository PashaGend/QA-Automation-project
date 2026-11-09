import { test, expect } from '@playwright/test';

// Read-only check against the REAL deployed app — never submits anything,
// never touches data. Safe to run on a schedule against production.
const PRODUCTION_URL = 'https://pgmondial2026.netlify.app';

test('production homepage loads and shows the login form', async ({ page }) => {
  await page.goto(PRODUCTION_URL);
  await expect(page.getByRole('textbox', { name: '0501234567' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'כניסה →' })).toBeVisible();
});
