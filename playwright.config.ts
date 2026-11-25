import type { LaunchOptions, BrowserContextOptions } from 'playwright';

type BrowserName = 'chromium' | 'firefox' | 'webkit';

const browser = (process.env.BROWSER || 'chromium') as BrowserName;

const chromiumArgs: string[] = [
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-setuid-sandbox',
  '--disable-web-security',
  '--ignore-certificate-errors',
  '--disable-extensions',
  '--incognito',
  '--disable-infobars',
];

interface PlaywrightConfig {
  browser: BrowserName;
  launchOptions: LaunchOptions;
  contextOptions: BrowserContextOptions;
}

const config: PlaywrightConfig = {
  browser,
  launchOptions: {
    headless: process.env.HEADLESS !== 'false',
    // SLOW_MO: milliseconds between browser actions. The steps wait on the page, not on the clock, so 0 works; 800 is comfortable to watch a headed run.
    slowMo: parseInt(process.env.SLOW_MO || (process.env.HEADLESS === 'false' ? '800' : '0'), 10),
    args: browser === 'chromium' ? chromiumArgs : [],
  },
  contextOptions: {
    // Wide enough for the navigation bars to show their links (they collapse below 992 pixels).
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: true,
  },
};

export = config;
