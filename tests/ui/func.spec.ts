import { test, expect } from '@playwright/test';

async function signUpNewUser(page) {
  const phone = '05' + Math.floor(10000000 + Math.random() * 9000000);
  const nickname = `test_user_${phone}`;
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).fill(phone);
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await page.getByRole('textbox', { name: 'שם' }).click();
  await page.getByRole('textbox', { name: 'שם' }).fill(nickname);
  await page.getByRole('button', { name: '🏆 הצטרף למשחק' }).click();
  return phone;
}

test('buttons functionality', async ({ page }) => {
  await signUpNewUser(page);
  await page.getByRole('button', { name: '⚽ משחקים' }).click();
  await expect(page.getByText('הניקוד שלי')).toBeVisible();
  await page.getByRole('button', { name: '🏆 טבלה' }).click();
  await expect(page.getByText('המיקום שלי')).toBeVisible();
  await page.getByRole('button', { name: '📊 סטטיסטיקה' }).click();
  await expect(page.getByText('בחר משתתף לצפייה:')).toBeVisible();
  await page.getByRole('button', { name: '⚙️ מנהל' }).click();
  await expect(page.getByRole('heading', { name: '🔐 כניסת מנהל' })).toBeVisible();
});

// Need to fix application - test is good
test('back button functionality', async ({ page }) => {
  test.fail();
  const phone = '05' + Math.floor(10000000 + Math.random() * 9000000);
  await page.goto('/');
  await page.getByRole('textbox', { name: '0501234567' }).fill(phone);
  await page.getByRole('button', { name: 'כניסה →' }).click();
  await page.getByRole('button', { name: 'חזרה' }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByRole('textbox', { name: '0501234567' })).toBeVisible();
});

test('Icons visability main page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('⚽')).toBeVisible();
  await page.getByRole('heading', { name: 'מונדיאל' }).click();
  await page.getByText('מספר טלפון').click();
  await page.getByText('מי מנחש נכון יותר?').click();
  await page.getByRole('textbox', { name: '0501234567' }).click();
  await page.getByText('משתמש קיים? תכנס אוטומטית').click();
  await page.getByRole('button', { name: 'כניסה →' }).click();
});

test('Icons visability second page', async ({ page }) => {
  await signUpNewUser(page);
  await expect(page.getByRole('heading', { name: 'מונדיאל' })).toBeVisible();
  await page.getByText('⚽').first().click();
  await expect(page.locator('div').filter({ hasText: /^🏆$/ })).toBeVisible();
  await page.getByText('הניקוד שלי').click();
  await page.getByRole('button', { name: '⚽ משחקים' }).click();
});
