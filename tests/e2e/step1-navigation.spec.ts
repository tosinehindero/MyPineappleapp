import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  dismissToasts,
  removeEmergentBadge,
  generateTestEmail,
  generateTestUsername,
} from '../fixtures/helpers';

test.describe('Registration - Step 1 to Step 2 Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
  });

  test('can fill Step 1 and navigate to Step 2', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testUsername = generateTestUsername();
    
    // Select account type
    await page.getByTestId('account-type-single-male').click();
    
    // Fill primary details
    await page.getByTestId('primary-name-input').fill('Test User');
    await page.getByTestId('primary-age-input').fill('30');
    
    // Fill credentials
    await page.getByTestId('username-input').fill(testUsername);
    await page.getByTestId('email-input').fill(testEmail);
    await page.getByTestId('password-input').fill('TestPass123!');
    await page.getByTestId('confirm-password-input').fill('TestPass123!');
    
    // Fill location
    await page.getByTestId('city-input').fill('Miami');
    await page.getByTestId('state-input').fill('Florida');
    await page.getByTestId('country-input').clear();
    await page.getByTestId('country-input').fill('USA');
    
    // Select travel status
    await page.getByTestId('travel-local-only').click();
    
    // Navigate to Step 2
    await page.getByTestId('step1-next-button').click();
    
    // Verify Step 2 is shown
    await expect(page.getByText('Experience Level')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('experience-brand-new--curious-')).toBeVisible();
  });

  test('travel status options are selectable', async ({ page }) => {
    await page.getByTestId('travel-local-only').click();
    await expect(page.getByTestId('travel-local-only')).toHaveClass(/bg-gold/);
    
    await page.getByTestId('travel-willing-to-travel--within-state-').click();
    await expect(page.getByTestId('travel-willing-to-travel--within-state-')).toHaveClass(/bg-gold/);
  });

  test('Step 1 validation shows errors for empty submission', async ({ page }) => {
    await page.getByTestId('step1-next-button').click();
    
    // Should still be on Step 1
    await expect(page.getByTestId('account-type-single-male')).toBeVisible();
    
    // Error should appear for missing account type
    await expect(page.locator('text=Please select your account type')).toBeVisible();
  });
});
