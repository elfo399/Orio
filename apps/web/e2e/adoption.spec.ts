import { expect, test } from '@playwright/test';

test('adopt, care for, and persist ORIO', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('What should we call them?')).toBeVisible();
  await page.getByLabel('Pet name').fill('Pip');
  await page.getByRole('button', { name: /Adopt ORIO/i }).click();
  await expect(page.getByRole('heading', { name: 'Pip', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Feed/i }).click();
  await expect(page.getByText('A delicious snack!')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pip', exact: true })).toBeVisible();
});
