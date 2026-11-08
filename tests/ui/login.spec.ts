import { test, expect } from '@playwright/test';

test('new user can sign up', async ({ page }) => {
  const phone = '05' + Math.floor(10000000 + Math.random() * 9000000);
  const nickname = `test_user_login_${phone}`;
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).fill(phone);
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await page.getByRole('textbox', { name: 'שם' }).click();
  await page.getByRole('textbox', { name: 'שם' }).fill(nickname);
  await page.getByRole('button', { name: '🏆 הצטרף למשחק' }).click();
  await expect(page.getByText(nickname)).toBeVisible();
});

test('admin login bypass', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).fill('0548009108');
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await expect(page.getByText('שלום, פאשה')).toBeVisible();
  await page.getByRole('button', { name: '⚙️ מנהל' }).click();
  await expect(page.getByRole('button', { name: '🔄 עדכן תוצאות אוטומטית' })).toBeVisible();
});

test('other users need admin password', async ({ page }) => {
  const phone = '05' + Math.floor(10000000 + Math.random() * 9000000);
  const nickname = `test_user_not_admin_${phone}`;
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).fill(phone);
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await page.getByRole('textbox', { name: 'שם' }).click();
  await page.getByRole('textbox', { name: 'שם' }).fill(nickname);
  await page.getByRole('button', { name: '🏆 הצטרף למשחק' }).click();
  await expect(page.getByText(nickname)).toBeVisible();
  await page.getByRole('button', { name: '⚙️ מנהל' }).click();
  await expect(page.getByRole('heading', { name: '🔐 כניסת מנהל' })).toBeVisible();
});

test('user can log out', async ({ page }) => {
  const phone = '05' + Math.floor(10000000 + Math.random() * 9000000);
  const nickname = `test_user_logout_${phone}`;
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).fill(phone);
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await page.getByRole('textbox', { name: 'שם' }).click();
  await page.getByRole('textbox', { name: 'שם' }).fill(nickname);
  await page.getByRole('button', { name: '🏆 הצטרף למשחק' }).click();
  await expect(page.getByText(nickname)).toBeVisible();
  await page.getByRole('button', { name: 'יציאה' }).click();
  await expect(page.getByRole('button', { name: 'כניסה →' })).toBeVisible();
});

test('session persists after refresh', async ({ page }) => {
  const phone = '05' + Math.floor(10000000 + Math.random() * 9000000);
  const nickname = `test_user_refresh_${phone}`;
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).fill(phone);
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await page.getByRole('textbox', { name: 'שם' }).click();
  await page.getByRole('textbox', { name: 'שם' }).fill(nickname);
  await page.getByRole('button', { name: '🏆 הצטרף למשחק' }).click();
  await expect(page.getByText(nickname)).toBeVisible();
  await page.reload();
  await expect(page.getByText(`שלום, ${nickname}`)).toBeVisible();
});

test('empty phone shows error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).click();
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await expect(page.getByText('מספר טלפון לא תקין')).toBeVisible();
});

// Need to fix application - test is good
test('big phone shows error (known bug: no max-length check)', async ({ page }) => {
  test.fail();
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).fill('05012345678');
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await expect(page.getByText('מספר טלפון לא תקין')).toBeVisible();
});

test('short phone shows error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).click();
  await page.getByRole('textbox', { name: '0501234567' }).fill('0501234');
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await expect(page.getByText('מספר טלפון לא תקין')).toBeVisible();
});

test('non-numeric phone shows error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).click();
  await page.getByRole('textbox', { name: '0501234567' }).fill('a');
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await expect(page.getByText('מספר טלפון לא תקין')).toBeVisible();
});
