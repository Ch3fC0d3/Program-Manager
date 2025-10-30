import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { summarize } from '../lib/ai-backend.js'

test.describe('Program Manager - Smoke Tests', () => {
  const findings = {
    errors: [],
    a11y: [],
    statuses: []
  }

  test('Homepage loads and is accessible', async ({ page }) => {
    await page.goto('/')
    
    // Check page loads
    await expect(page).toHaveTitle(/Program Manager|Project Management/)
    findings.statuses.push({ page: 'Homepage', status: 'loaded' })
    
    // Run accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    findings.a11y.push({
      page: 'Homepage',
      violations: accessibilityScanResults.violations.length,
      details: accessibilityScanResults.violations.slice(0, 5)
    })
    
    // Check for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        findings.errors.push({ page: 'Homepage', error: msg.text() })
      }
    })
  })

  test('Login page is accessible', async ({ page }) => {
    await page.goto('/login')
    
    // Check login form exists
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    
    findings.statuses.push({ page: 'Login', status: 'loaded' })
    
    // Accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze()
    findings.a11y.push({
      page: 'Login',
      violations: accessibilityScanResults.violations.length,
      details: accessibilityScanResults.violations.slice(0, 5)
    })
  })

  test('Dashboard requires authentication', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to login
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
    
    findings.statuses.push({ page: 'Dashboard (unauthenticated)', status: 'redirected to login' })
  })

  test('Manifest and favicon load correctly', async ({ page }) => {
    await page.goto('/')
    
    // Check manifest
    const manifestResponse = await page.request.get('/manifest.json')
    expect(manifestResponse.status()).toBe(200)
    findings.statuses.push({ page: 'Manifest', status: manifestResponse.status() })
    
    // Check favicon
    const faviconResponse = await page.request.get('/favicon.ico')
    expect(faviconResponse.status()).toBe(200)
    findings.statuses.push({ page: 'Favicon', status: faviconResponse.status() })
  })

  test('API endpoints return proper status codes', async ({ page }) => {
    // Test public endpoints
    const endpoints = [
      { path: '/api/auth/session', expectedStatus: 200 },
      { path: '/api/dashboard-files', expectedStatus: 401 }, // Should require auth
    ]
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint.path)
      findings.statuses.push({
        endpoint: endpoint.path,
        expected: endpoint.expectedStatus,
        actual: response.status()
      })
      
      if (response.status() !== endpoint.expectedStatus) {
        findings.errors.push({
          endpoint: endpoint.path,
          error: `Expected ${endpoint.expectedStatus}, got ${response.status()}`
        })
      }
    }
  })

  test.afterAll(async () => {
    // Generate AI summary of findings
    console.log('\n=== TEST FINDINGS ===')
    console.log(JSON.stringify(findings, null, 2))
    
    console.log('\n=== AI SUMMARY ===')
    const summary = await summarize(findings)
    console.log(summary)
    console.log('\n====================')
  })
})
