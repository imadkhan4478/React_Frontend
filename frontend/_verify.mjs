import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const consoleErrors = []
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message))

await page.goto('http://localhost:5173')
await page.waitForSelector('text=QG-IRS', { timeout: 15000 })
await page.fill('#username', 'admin')
await page.fill('#password', 'admin123')
await page.click('button[type="submit"]')
await page.waitForSelector('text=Executive Dashboard', { timeout: 15000 })
await page.waitForTimeout(3000)
await page.screenshot({ path: '_verify_long_wait.png', fullPage: true })
console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors))
await browser.close()
