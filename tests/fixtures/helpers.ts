import { Page, expect } from '@playwright/test';

export async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
}

export async function dismissToasts(page: Page) {
  await page.addLocatorHandler(
    page.locator('[data-sonner-toast], .Toastify__toast, [role="status"].toast, .MuiSnackbar-root'),
    async () => {
      const close = page.locator('[data-sonner-toast] [data-close], [data-sonner-toast] button[aria-label="Close"], .Toastify__close-button, .MuiSnackbar-root button');
      await close.first().click({ timeout: 2000 }).catch(() => {});
    },
    { times: 10, noWaitAfter: true }
  );
}

export async function checkForErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const errorElements = Array.from(
      document.querySelectorAll('.error, [class*="error"], [id*="error"]')
    );
    return errorElements.map(el => el.textContent || '').filter(Boolean);
  });
}

export async function removeEmergentBadge(page: Page) {
  await page.evaluate(() => {
    const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
    if (badge) badge.remove();
  });
}

// Registration form helpers

export async function fillStep1BasicData(page: Page, data: {
  accountType: string;
  primaryName: string;
  primaryAge: string;
  username: string;
  email: string;
  password: string;
  city: string;
  state: string;
  country: string;
  travelStatus: string;
}) {
  // Click account type
  await page.getByTestId(`account-type-${data.accountType.toLowerCase().replace(/[^a-z]/g, '-')}`).click();
  
  // Fill primary user details
  await page.getByTestId('primary-name-input').fill(data.primaryName);
  await page.getByTestId('primary-age-input').fill(data.primaryAge);
  
  // Fill account credentials
  await page.getByTestId('username-input').fill(data.username);
  await page.getByTestId('email-input').fill(data.email);
  await page.getByTestId('password-input').fill(data.password);
  await page.getByTestId('confirm-password-input').fill(data.password);
  
  // Fill location
  await page.getByTestId('city-input').fill(data.city);
  await page.getByTestId('state-input').fill(data.state);
  await page.getByTestId('country-input').clear();
  await page.getByTestId('country-input').fill(data.country);
  
  // Click travel status
  await page.getByTestId(`travel-${data.travelStatus.toLowerCase().replace(/[^a-z]/g, '-')}`).click();
}

export async function goToStep2(page: Page) {
  await page.getByTestId('step1-next-button').click();
}

export async function fillStep2BasicData(page: Page, data: {
  experienceLevel: string;
  communityTenure: string;
  interests: string[];
  preferenceType: string;
  aboutYou: string;
  fantasies: string;
}) {
  // Click experience level
  await page.getByTestId(`experience-${data.experienceLevel.toLowerCase().replace(/[^a-z]/g, '-')}`).click();
  
  // Click community tenure
  await page.getByTestId(`tenure-${data.communityTenure.toLowerCase().replace(/[^a-z]/g, '-')}`).click();
  
  // Click interests (need at least 3)
  for (const interest of data.interests) {
    await page.getByTestId(`interest-${interest.toLowerCase().replace(/[^a-z]/g, '-')}`).click();
  }
  
  // Click preference type
  await page.getByTestId(`preference-${data.preferenceType.toLowerCase().replace(/[^a-z]/g, '-')}`).click();
  
  // Fill about you
  await page.getByTestId('about-you-textarea').fill(data.aboutYou);
  
  // Fill fantasies
  await page.getByTestId('fantasies-textarea').fill(data.fantasies);
}

export async function goToStep3(page: Page) {
  await page.getByTestId('step2-next-button').click();
}

export function generateTestEmail(): string {
  return `test_${Date.now()}@testpineapple.com`;
}

export function generateTestUsername(): string {
  return `TestUser_${Date.now()}`;
}
