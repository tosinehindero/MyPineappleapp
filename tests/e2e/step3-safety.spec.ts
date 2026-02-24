import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  dismissToasts,
  removeEmergentBadge,
  generateTestEmail,
  generateTestUsername,
} from '../fixtures/helpers';

async function navigateToStep3(page: any) {
  const testEmail = generateTestEmail();
  const testUsername = generateTestUsername();
  
  // Step 1
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
  
  // Step 2
  await expect(page.getByText('Experience Level')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('experience-beginner--less-than---year-').click();
  await page.getByTestId('tenure-just-starting-out').click();
  await page.getByTestId('interest-casual-dating').click();
  await page.getByTestId('interest-friendship-first').click();
  await page.getByTestId('interest-event-companions').click();
  await page.getByTestId('preference-both-singles---couples').click();
  
  const aboutText = 'This is my test about me text for the registration form. I am testing the full flow of the 3-step registration. This needs to be at least 100 characters long.';
  const fantasiesText = 'This is my test fantasies text. It needs at least 50 characters.';
  
  await page.getByTestId('about-you-textarea').fill(aboutText);
  await page.getByTestId('fantasies-textarea').fill(fantasiesText);
  await page.getByTestId('step2-next-button').click();
  
  // Wait for Step 3
  await expect(page.getByText('Safety & Consent Pledges')).toBeVisible({ timeout: 10000 });
}

test.describe('Registration - Step 3 Safety & Media', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
    await navigateToStep3(page);
  });

  test('Step 3 shows all 5 consent pledges', async ({ page }) => {
    await expect(page.getByText('Consent Pledge')).toBeVisible();
    await expect(page.getByText('Privacy Agreement')).toBeVisible();
    await expect(page.getByText('Health & Safety Standards')).toBeVisible();
    await expect(page.getByText('Video Vetting Agreement')).toBeVisible();
    await expect(page.getByText('Age Verification')).toBeVisible();
  });

  test('Step 3 shows photo upload area', async ({ page }) => {
    await expect(page.getByText('Profile Photos')).toBeVisible();
    await expect(page.getByText('0/10 photos')).toBeVisible();
    await expect(page.getByText('Click to upload')).toBeVisible();
    await expect(page.getByTestId('photo-upload-input')).toBeVisible();
    await expect(page.getByText('3-10 photos required')).toBeVisible();
  });

  test('Step 3 shows video upload area (optional)', async ({ page }) => {
    await expect(page.getByText('Video Introduction')).toBeVisible();
    await expect(page.getByText('(Optional but recommended)')).toBeVisible();
    await expect(page.getByTestId('video-upload-input')).toBeVisible();
  });

  test('Verified Pineapple badge info is displayed', async ({ page }) => {
    await expect(page.getByText('Earn Your Verified Pineapple Badge')).toBeVisible();
    await expect(page.getByText(/Verified members get 3x more/)).toBeVisible();
  });

  test('submit button is disabled without consents and photos', async ({ page }) => {
    await expect(page.getByTestId('submit-registration-button')).toBeDisabled();
  });
});

test.describe('Registration - Consent Pledges Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
    await navigateToStep3(page);
  });

  test('can click and toggle consent pledge', async ({ page }) => {
    // Find consent pledge container and click
    const consentPledge = page.locator('div').filter({ hasText: /^Consent PledgeI pledge to always respect/ });
    await consentPledge.first().click();
    
    // Should show green styling after click
    await expect(consentPledge.first()).toHaveClass(/border-green|bg-green/);
  });
});
