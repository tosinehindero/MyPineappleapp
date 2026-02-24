import { test, expect } from '@playwright/test';
import {
  waitForAppReady,
  dismissToasts,
  removeEmergentBadge,
  generateTestEmail,
  generateTestUsername,
} from '../fixtures/helpers';

test.describe('Registration Form - Step Navigation & Progress', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
  });

  test('displays progress bar with 3 steps on load', async ({ page }) => {
    // Check page title
    await expect(page.getByText('Join PineapplePlay')).toBeVisible();
    
    // Check 3 step indicators are present
    await expect(page.getByText('Account & Logistics')).toBeVisible();
    await expect(page.getByText('Lifestyle Profile')).toBeVisible();
    await expect(page.getByText('Safety & Media')).toBeVisible();
    
    // Check step 1 is active (golden background for icon)
    const step1Container = page.locator('text=Account & Logistics').locator('..');
    await expect(step1Container).toBeVisible();
  });

  test('Step 1 shows all required form sections', async ({ page }) => {
    // Account Type section
    await expect(page.getByText('Account Type')).toBeVisible();
    await expect(page.getByTestId('account-type-single-male')).toBeVisible();
    await expect(page.getByTestId('account-type-single-female')).toBeVisible();
    await expect(page.getByTestId('account-type-couple--m-f-')).toBeVisible();
    
    // Your Details section
    await expect(page.getByText('Your Details')).toBeVisible();
    await expect(page.getByTestId('primary-name-input')).toBeVisible();
    await expect(page.getByTestId('primary-age-input')).toBeVisible();
    
    // Account Credentials section
    await expect(page.getByText('Account Credentials')).toBeVisible();
    await expect(page.getByTestId('username-input')).toBeVisible();
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('confirm-password-input')).toBeVisible();
    
    // Location section
    await expect(page.getByText('Location')).toBeVisible();
    await expect(page.getByTestId('city-input')).toBeVisible();
    await expect(page.getByTestId('state-input')).toBeVisible();
    await expect(page.getByTestId('country-input')).toBeVisible();
    
    // Travel Willingness section
    await expect(page.getByText('Travel Willingness')).toBeVisible();
    await expect(page.getByTestId('travel-local-only')).toBeVisible();
    
    // Continue button
    await expect(page.getByTestId('step1-next-button')).toBeVisible();
  });

  test('account type selection for couples shows partner fields', async ({ page }) => {
    // Select couple account type
    await page.getByTestId('account-type-couple--m-f-').click();
    
    // Partner section should appear
    await expect(page.getByText('Partner/Secondary Member')).toBeVisible();
    await expect(page.getByTestId('secondary-name-input')).toBeVisible();
    await expect(page.getByTestId('secondary-age-input')).toBeVisible();
  });

  test('Step 1 validation prevents empty submission', async ({ page }) => {
    // Try to submit without filling required fields
    await page.getByTestId('step1-next-button').click();
    
    // Should show validation errors - still on step 1
    await expect(page.getByText('Account Type')).toBeVisible();
    
    // Check for error messages (the form uses zod validation)
    await expect(page.locator('text=/Please select/i').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Registration Form - Step 1 Form Filling', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
  });

  test('can fill Step 1 and proceed to Step 2', async ({ page }) => {
    const testEmail = generateTestEmail();
    const testUsername = generateTestUsername();
    
    // Select account type
    await page.getByTestId('account-type-single-male').click();
    await expect(page.getByTestId('account-type-single-male')).toHaveClass(/bg-gold/);
    
    // Fill primary details
    await page.getByTestId('primary-name-input').fill('Test User');
    await page.getByTestId('primary-age-input').fill('30');
    
    // Fill account credentials
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
    
    // Click continue
    await page.getByTestId('step1-next-button').click();
    
    // Should be on Step 2 now - check for Experience Level heading
    await expect(page.getByText('Experience Level')).toBeVisible({ timeout: 10000 });
  });

  test('travel status options are selectable', async ({ page }) => {
    // Test each travel option
    await page.getByTestId('travel-local-only').click();
    await expect(page.getByTestId('travel-local-only')).toHaveClass(/bg-gold/);
    
    await page.getByTestId('travel-willing-to-travel--within-state-').click();
    await expect(page.getByTestId('travel-willing-to-travel--within-state-')).toHaveClass(/bg-gold/);
    
    await page.getByTestId('travel-willing-to-travel--domestic-').click();
    await expect(page.getByTestId('travel-willing-to-travel--domestic-')).toHaveClass(/bg-gold/);
  });
});

test.describe('Registration Form - Step 2 Lifestyle Profile', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
    
    // Fill and submit Step 1 to get to Step 2
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
    
    // Wait for Step 2
    await expect(page.getByText('Experience Level')).toBeVisible({ timeout: 10000 });
  });

  test('Step 2 shows all required sections', async ({ page }) => {
    // Experience Level section
    await expect(page.getByText('Experience Level')).toBeVisible();
    await expect(page.getByTestId('experience-brand-new--curious-')).toBeVisible();
    
    // Community tenure section
    await expect(page.getByText('How long in the community?')).toBeVisible();
    await expect(page.getByTestId('tenure-just-starting-out')).toBeVisible();
    
    // Interests section
    await expect(page.getByText('Your Interests')).toBeVisible();
    await expect(page.getByText('selected (min 3)')).toBeVisible();
    
    // Connection Preferences section  
    await expect(page.getByText('Connection Preferences')).toBeVisible();
    
    // Age Range section
    await expect(page.getByText(/Preferred Age Range/)).toBeVisible();
    
    // About You section
    await expect(page.getByText('About You')).toBeVisible();
    await expect(page.getByTestId('about-you-textarea')).toBeVisible();
    
    // Fantasies section
    await expect(page.getByText('Fantasies & Desires')).toBeVisible();
    await expect(page.getByTestId('fantasies-textarea')).toBeVisible();
    
    // Navigation buttons
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(page.getByTestId('step2-next-button')).toBeVisible();
  });

  test('can select experience level', async ({ page }) => {
    await page.getByTestId('experience-beginner--less-than-1-year-').click();
    await expect(page.getByTestId('experience-beginner--less-than-1-year-')).toHaveClass(/bg-gold/);
  });

  test('can select multiple interests (min 3 required)', async ({ page }) => {
    // The interests are in collapsible categories, Social & Dating should be expanded by default
    await page.getByTestId('interest-casual-dating').click();
    await page.getByTestId('interest-friendship-first').click();
    await page.getByTestId('interest-event-companions').click();
    
    // Check counter shows 3 selected
    await expect(page.getByText('3 selected (min 3)')).toBeVisible();
  });

  test('about you textarea shows character count', async ({ page }) => {
    const testText = 'This is a test about me text. It needs to be at least 100 characters long to pass validation. I am adding more text here to reach the minimum character limit.';
    
    await page.getByTestId('about-you-textarea').fill(testText);
    
    // Check character count displays
    await expect(page.getByText(`${testText.length} / 2000 characters (min 100)`)).toBeVisible();
  });

  test('fantasies textarea shows character count', async ({ page }) => {
    const testText = 'This is a test fantasy text. It needs at least 50 characters.';
    
    await page.getByTestId('fantasies-textarea').fill(testText);
    
    // Check character count displays  
    await expect(page.getByText(`${testText.length} / 1500 characters (min 50)`)).toBeVisible();
  });

  test('back button returns to Step 1 with data preserved', async ({ page }) => {
    // Click back
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Should be on Step 1
    await expect(page.getByText('Account Type')).toBeVisible();
    
    // Data should be preserved - Single Male should still be selected
    await expect(page.getByTestId('account-type-single-male')).toHaveClass(/bg-gold/);
    
    // Name should still be filled
    await expect(page.getByTestId('primary-name-input')).toHaveValue('Test User');
  });
});

test.describe('Registration Form - Step 3 Safety & Media', () => {
  test.beforeEach(async ({ page }) => {
    await dismissToasts(page);
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
    await removeEmergentBadge(page);
    
    // Fill Step 1
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
    
    // Fill Step 2
    await expect(page.getByText('Experience Level')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('experience-beginner--less-than-1-year-').click();
    await page.getByTestId('tenure-just-starting-out').click();
    await page.getByTestId('interest-casual-dating').click();
    await page.getByTestId('interest-friendship-first').click();
    await page.getByTestId('interest-event-companions').click();
    await page.getByTestId('preference-both-singles---couples').click();
    
    const aboutYouText = 'This is my test about me text. I am filling this out to test the registration form. I need to have at least 100 characters to pass validation so I am writing more.';
    const fantasiesText = 'This is my test fantasies text. It needs at least 50 characters long.';
    
    await page.getByTestId('about-you-textarea').fill(aboutYouText);
    await page.getByTestId('fantasies-textarea').fill(fantasiesText);
    await page.getByTestId('step2-next-button').click();
    
    // Wait for Step 3
    await expect(page.getByText('Safety & Consent Pledges')).toBeVisible({ timeout: 10000 });
  });

  test('Step 3 shows all consent pledges', async ({ page }) => {
    // Check all 5 consent items are visible
    await expect(page.getByText('Consent Pledge')).toBeVisible();
    await expect(page.getByText('Privacy Agreement')).toBeVisible();
    await expect(page.getByText('Health & Safety Standards')).toBeVisible();
    await expect(page.getByText('Video Vetting Agreement')).toBeVisible();
    await expect(page.getByText('Age Verification')).toBeVisible();
  });

  test('consent pledges are clickable and toggle', async ({ page }) => {
    // Click on Consent Pledge - should toggle to checked
    const consentPledge = page.locator('div').filter({ hasText: /^Consent Pledge/ }).first();
    await consentPledge.click();
    
    // Check it now has green styling
    await expect(page.locator('div').filter({ hasText: 'Consent Pledge' }).first()).toHaveClass(/border-green|bg-green/);
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

  test('Step 3 shows Verified Pineapple badge info', async ({ page }) => {
    await expect(page.getByText('Earn Your Verified Pineapple Badge')).toBeVisible();
    await expect(page.getByText(/Verified members get 3x more profile views/)).toBeVisible();
  });

  test('submit button is disabled without all consents and photos', async ({ page }) => {
    // Submit button should be disabled
    await expect(page.getByTestId('submit-registration-button')).toBeDisabled();
  });

  test('back button returns to Step 2', async ({ page }) => {
    await page.getByRole('button', { name: 'Back' }).click();
    
    // Should be on Step 2
    await expect(page.getByText('Experience Level')).toBeVisible();
    await expect(page.getByTestId('about-you-textarea')).toBeVisible();
  });
});
