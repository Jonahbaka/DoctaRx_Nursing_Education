'use strict';

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const password = process.env.NURSING_TEST_ACCOUNT_PASSWORD || 'Demo12345678!';
const roles = [
  { label: 'Student Nurse', email: 'student@demo.doctarx.com', route: '/ng/nursing/student', tab: 'LMS' },
  { label: 'Lecturer', email: 'teacher@demo.doctarx.com', route: '/ng/nursing/lecturer', tab: 'LMS' },
  { label: 'HOD / Department Admin', email: 'hod@demo.doctarx.com', route: '/ng/nursing/hod', tab: 'Reports' },
  { label: 'Clinical Coordinator', email: 'coordinator@demo.doctarx.com', route: '/ng/nursing/coordinator', tab: 'Logbook' },
  { label: 'Clinical Supervisor / Preceptor', email: 'supervisor@demo.doctarx.com', route: '/ng/nursing/supervisor', tab: 'Logbook' },
  { label: 'Institution Admin', email: 'school@demo.doctarx.com', route: '/ng/nursing/admin', tab: 'Institution' },
];

async function openNavigationIfNeeded(page) {
  const menu = page.getByRole('button', { name: 'Open navigation' });
  if (await menu.isVisible()) await menu.click();
}

for (const role of roles) {
  test(`${role.label} authenticated dashboard and persisted workflow`, async ({ page }, testInfo) => {
    const runtimeErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => runtimeErrors.push(`page: ${error.message}`));
    page.on('requestfailed', (request) => runtimeErrors.push(`request: ${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));
    page.on('response', (response) => {
      if (response.status() >= 500) runtimeErrors.push(`response: ${response.status()} ${response.url()}`);
    });

    await page.goto('/ng/nursing/login');
    await page.getByLabel('Email').fill(role.email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(new RegExp(`${role.route.replaceAll('/', '\\/')}$`));
    await expect(page.getByRole('heading', { name: role.label, exact: true })).toBeVisible();

    const session = await page.evaluate(async () => (await fetch('/api/nursing/session')).json());
    expect(session.success).toBe(true);
    expect(session.user.email).toBe(role.email);
    const bootstrap = await page.evaluate(async () => (await fetch('/api/nursing/bootstrap')).json());
    expect(bootstrap.success).toBe(true);
    expect(bootstrap.state.institution).toBeTruthy();

    await openNavigationIfNeeded(page);
    await page.getByRole('button', { name: role.tab, exact: true }).click();

    if (role.email.startsWith('nursing.student.')) {
      await expect(page.getByRole('heading', { name: 'Course catalogue' })).toBeVisible();
      await page.getByLabel('Search courses').fill('telehealth');
      await expect(page.getByText('Foundations of Telehealth Nursing', { exact: true }).first()).toBeVisible();
      await page.getByLabel('Private lesson notes').fill(`Fictional browser note ${testInfo.project.name}`);
      await page.getByLabel('Resume position (seconds)').fill('77');
      const bookmark = page.getByRole('button', { name: /^Bookmark(?:ed)?$/ });
      if ((await bookmark.textContent()).trim() === 'Bookmark') {
        await bookmark.click();
        await expect(page.getByRole('button', { name: 'Bookmarked', exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: 'Save notes' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'saved' })).toBeVisible();
      await page.getByLabel('Ask about this course').fill('How should privacy and consent work in remote care?');
      await page.getByRole('button', { name: 'Ask assistant' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Based on your authorized course material' })).toBeVisible();
      const refreshed = await page.evaluate(async () => (await fetch('/api/nursing/bootstrap')).json());
      expect(refreshed.state.learnerActivities.some((item) => item.resumeSeconds === 77 && item.bookmarked)).toBe(true);
    }

    if (role.email.startsWith('ifeoma.')) {
      const title = `Fictional browser course ${testInfo.project.name}`;
      await page.getByPlaceholder('Course title').fill(title);
      await page.getByRole('button', { name: 'Create Course' }).click();
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
      const refreshed = await page.evaluate(async () => (await fetch('/api/nursing/bootstrap')).json());
      expect(refreshed.state.courses.some((course) => course.title === title)).toBe(true);
    }

    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(accessibility.violations, JSON.stringify(accessibility.violations, null, 2)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${role.email.split('@')[0]}-${testInfo.project.name}.png`), fullPage: true });
    expect(runtimeErrors, runtimeErrors.join('\n')).toEqual([]);
  });
}
