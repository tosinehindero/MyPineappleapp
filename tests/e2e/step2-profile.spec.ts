import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  dismissToasts,
  removeEmergentBadge,
  generateTestEmail,
  generateTestUsername,
} from '../fixtures/helpers';

async function navigateToStep2(page: any) {
  const testEmail = generateTestEmail();
  const testUsername = generateTestUsername();
  
  await page.getByTestId('account-type-single-male').click();
  await page.getByTestId('primary-name-input').fill('Test User');
  await page.getByTestId('primary-age-input').fill('30');
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
  await expect(page.getByText('Experience Level')).toBeVisible({ timeout: 10000 });
}

test.describe('Registration - Step 2 Display', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
    await navigateToStep2(page);
  });

  test('Step 2 shows all required sections', async ({ page }) => {
    await expect(page.getByText('Experience Level')).toBeVisible();
    await expect(page.getByText('How long in the community?')).toBeVisible();
    await expect(page.getByText('Your Interests')).toBeVisible();
    await expect(page.getByText('Connection Preferences')).toBeVisible();
    await expect(page.getByText(/Preferred Age Range/)).toBeVisible();
    await expect(page.getByText('About You')).toBeVisible();
    await expect(page.getByText('Fantasies & Desires')).toBeVisible();
  });

  test('Step 2 shows experience level options', async ({ page }) => {
    // Use correct data-testids based on actual values
    await expect(page.getByTestId('experience-brand-new--curious-')).toBeVisible();
    await expect(page.getByTestId('experience-beginner--less-than---year-')).toBeVisible();
    await expect(page.getByTestId('experience-intermediate------years-')).toBeVisible();
  });

  test('Step 2 shows community tenure options', async ({ page }) => {
    await expect(page.getByTestId('tenure-just-starting-out')).toBeVisible();
    await expect(page.getByTestId('tenure-less-than---months')).toBeVisible();
    await expect(page.getByTestId('tenure---months-----year')).toBeVisible();
  });

  test('Step 2 shows interest selection with counter', async ({ page }) => {
    await expect(page.getByText('0 selected (min 3)')).toBeVisible();
    await expect(page.getByTestId('interest-casual-dating')).toBeVisible();
  });

  test('Step 2 shows preference options', async ({ page }) => {
    await expect(page.getByTestId('preference-singles-only')).toBeVisible();
    await expect(page.getByTestId('preference-couples-only')).toBeVisible();
    await expect(page.getByTestId('preference-both-singles---couples')).toBeVisible();
  });
});

test.describe('Registration - Step 2 Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
    await navigateToStep2(page);
  });

  test('can select experience level', async ({ page }) => {
    await page.getByTestId('experience-beginner--less-than---year-').click();
    await expect(page.getByTestId('experience-beginner--less-than---year-')).toHaveClass(/bg-gold/);
  });

  test('selecting interests updates counter', async ({ page }) => {
    await page.getByTestId('interest-casual-dating').click();
    await expect(page.getByText('1 selected (min 3)')).toBeVisible();
    
    await page.getByTestId('interest-friendship-first').click();
    await expect(page.getByText('2 selected (min 3)')).toBeVisible();
    
    await page.getByTestId('interest-event-companions').click();
    await expect(page.getByText('3 selected (min 3)')).toBeVisible();
  });

  test('about you textarea shows character count', async ({ page }) => {
    const testText = 'This is a test about me. Adding more characters to reach minimum. Testing the registration form thoroughly.';
    await page.getByTestId('about-you-textarea').fill(testText);
    await expect(page.getByText(`${testText.length} / 2000 characters (min 100)`)).toBeVisible();
  });
});
