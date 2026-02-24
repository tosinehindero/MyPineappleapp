import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  dismissToasts,
  removeEmergentBadge,
  generateTestEmail,
  generateTestUsername,
} from '../fixtures/helpers';

test.describe('Registration Form - Step 1', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
  });

  test('displays progress bar with 3 steps', async ({ page }) => {
    await expect(page.getByText('Join PineapplePlay')).toBeVisible();
    // Use exact match to avoid duplicate text issues
    await expect(page.getByText('Account & Logistics', { exact: true })).toBeVisible();
    await expect(page.getByText('Lifestyle Profile', { exact: true })).toBeVisible();
    await expect(page.getByText('Safety & Media', { exact: true })).toBeVisible();
  });

  test('Step 1 shows all account type options', async ({ page }) => {
    await expect(page.getByTestId('account-type-single-male')).toBeVisible();
    await expect(page.getByTestId('account-type-single-female')).toBeVisible();
    await expect(page.getByTestId('account-type-couple--m-f-')).toBeVisible();
    await expect(page.getByTestId('account-type-couple--m-m-')).toBeVisible();
    await expect(page.getByTestId('account-type-couple--f-f-')).toBeVisible();
    await expect(page.getByTestId('account-type-poly-triad')).toBeVisible();
  });

  test('Step 1 shows all required form fields', async ({ page }) => {
    await expect(page.getByTestId('primary-name-input')).toBeVisible();
    await expect(page.getByTestId('primary-age-input')).toBeVisible();
    await expect(page.getByTestId('username-input')).toBeVisible();
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('confirm-password-input')).toBeVisible();
    await expect(page.getByTestId('city-input')).toBeVisible();
    await expect(page.getByTestId('state-input')).toBeVisible();
    await expect(page.getByTestId('country-input')).toBeVisible();
    await expect(page.getByTestId('travel-local-only')).toBeVisible();
    await expect(page.getByTestId('step1-next-button')).toBeVisible();
  });

  test('couples account type shows partner fields', async ({ page }) => {
    await page.getByTestId('account-type-couple--m-f-').click();
    await expect(page.getByText('Partner/Secondary Member')).toBeVisible();
    await expect(page.getByTestId('secondary-name-input')).toBeVisible();
    await expect(page.getByTestId('secondary-age-input')).toBeVisible();
  });
});
