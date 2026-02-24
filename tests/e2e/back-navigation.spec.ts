import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  dismissToasts,
  removeEmergentBadge,
  generateTestEmail,
  generateTestUsername,
} from '../fixtures/helpers';

test.describe('Registration - Back Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
  });

  test('back from Step 2 preserves Step 1 data', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testUsername = generateTestUsername();
    
    // Fill Step 1
    await page.getByTestId('account-type-single-male').click();
    await page.getByTestId('primary-name-input').fill('John Doe');
    await page.getByTestId('username-input').fill(testUsername);
    await page.getByTestId('email-input').fill(testEmail);
    await page.getByTestId('password-input').fill('TestPass123!');
    await page.getByTestId('confirm-password-input').fill('TestPass123!');
    await page.getByTestId('city-input').fill('Miami');
    await page.getByTestId('state-input').fill('Florida');
    await page.getByTestId('country-input').clear();
    await page.getByTestId('country-input').fill('USA');
    await page.getByTestId('travel-local-only').click();
    await page.getByTestId('step1-next-button').click();
    
    // Verify on Step 2
    await expect(page.getByText('Experience Level')).toBeVisible({ timeout: 10000 });
    
    // Click Back
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Verify back on Step 1
    await expect(page.getByText('Account Type')).toBeVisible();
    
    // Verify data is preserved
    await expect(page.getByTestId('account-type-single-male')).toHaveClass(/bg-gold/);
    await expect(page.getByTestId('primary-name-input')).toHaveValue('John Doe');
    await expect(page.getByTestId('username-input')).toHaveValue(testUsername);
    await expect(page.getByTestId('email-input')).toHaveValue(testEmail);
    await expect(page.getByTestId('city-input')).toHaveValue('Miami');
    await expect(page.getByTestId('state-input')).toHaveValue('Florida');
    await expect(page.getByTestId('travel-local-only')).toHaveClass(/bg-gold/);
  });

  test('back from Step 3 preserves Step 2 data', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testUsername = generateTestUsername();
    
    // Fill Step 1
    await page.getByTestId('account-type-single-male').click();
    await page.getByTestId('primary-name-input').fill('Test');
    await page.getByTestId('primary-age-input').fill('30');
    await page.getByTestId('username-input').fill(testUsername);
    await page.getByTestId('email-input').fill(testEmail);
    await page.getByTestId('password-input').fill('TestPass123!');
    await page.getByTestId('confirm-password-input').fill('TestPass123!');
    await page.getByTestId('city-input').fill('Miami');
    await page.getByTestId('state-input').fill('FL');
    await page.getByTestId('country-input').clear();
    await page.getByTestId('country-input').fill('US');
    await page.getByTestId('travel-local-only').click();
    await page.getByTestId('step1-next-button').click();
    
    // Fill Step 2
    await expect(page.getByText('Experience Level')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('experience-beginner--less-than---year-').click();
    await page.getByTestId('tenure-just-starting-out').click();
    await page.getByTestId('interest-casual-dating').click();
    await page.getByTestId('interest-friendship-first').click();
    await page.getByTestId('interest-event-companions').click();
    await page.getByTestId('preference-both-singles---couples').click();
    
    const aboutText = 'This is my about me text for testing. I need at least 100 characters here so I am adding some filler text to make it long enough.';
    const fantasiesText = 'This is my fantasies text. It needs at least 50 characters.';
    
    await page.getByTestId('about-you-textarea').fill(aboutText);
    await page.getByTestId('fantasies-textarea').fill(fantasiesText);
    await page.getByTestId('step2-next-button').click();
    
    // Verify on Step 3
    await expect(page.getByText('Safety & Consent Pledges')).toBeVisible({ timeout: 10000 });
    
    // Click Back
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Verify back on Step 2
    await expect(page.getByText('Experience Level')).toBeVisible();
    
    // Verify data is preserved
    await expect(page.getByTestId('experience-beginner--less-than---year-')).toHaveClass(/bg-gold/);
    await expect(page.getByTestId('tenure-just-starting-out')).toHaveClass(/bg-gold/);
    await expect(page.getByTestId('about-you-textarea')).toHaveValue(aboutText);
    await expect(page.getByTestId('fantasies-textarea')).toHaveValue(fantasiesText);
    await expect(page.getByText('3 selected (min 3)')).toBeVisible();
  });
});
