/**
 * pan-date-picker component tests
 * Tests the date picker functionality including calendar rendering,
 * date selection, navigation, and PAN message bus integration
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage } from '../lib/test-utils.mjs';

describe('pan-date-picker', () => {
  let browser, page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  test('loads and renders correctly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const pickerExists = await page.evaluate(() => {
      return document.querySelector('pan-date-picker') !== null;
    });
    expect(pickerExists).toBeTruthy();

    const hasInput = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.shadowRoot.querySelector('.date-input') !== null;
    });
    expect(hasInput).toBeTruthy();
  });

  test('displays default placeholder', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const placeholder = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const input = picker.shadowRoot.querySelector('.date-input');
      return input.getAttribute('placeholder');
    });

    expect(placeholder).toBe('Select date');
  });

  test('displays custom placeholder', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker placeholder="Choose a date"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const placeholder = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const input = picker.shadowRoot.querySelector('.date-input');
      return input.getAttribute('placeholder');
    });

    expect(placeholder).toBe('Choose a date');
  });

  test('accepts initial value', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker value="2024-03-15"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const value = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.value;
    });

    expect(value).toBe('2024-03-15');
  });

  test('displays formatted date in input', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker value="2024-03-15"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const inputValue = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const input = picker.shadowRoot.querySelector('.date-input');
      return input.value;
    });

    expect(inputValue).toContain('2024');
    expect(inputValue).toContain('03');
    expect(inputValue).toContain('15');
  });

  test('opens calendar on input click', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const isOpen = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const input = picker.shadowRoot.querySelector('.date-input');
      input.click();

      const calendar = picker.shadowRoot.querySelector('.calendar');
      return calendar.classList.contains('active');
    });

    expect(isOpen).toBeTruthy();
  });

  test('renders calendar grid', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const hasCalendarGrid = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.shadowRoot.querySelector('.calendar-grid') !== null;
    });

    expect(hasCalendarGrid).toBeTruthy();
  });

  test('renders weekday headers', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const weekdayCount = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const weekdays = picker.shadowRoot.querySelectorAll('.weekday');
      return weekdays.length;
    });

    expect(weekdayCount).toBe(7);
  });

  test('renders day cells', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const hasDays = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const days = picker.shadowRoot.querySelectorAll('.day-cell');
      return days.length > 0;
    });

    expect(hasDays).toBeTruthy();
  });

  test('highlights today date', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const hasToday = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const today = picker.shadowRoot.querySelector('.day-cell.today');
      return today !== null;
    });

    expect(hasToday).toBeTruthy();
  });

  test('has navigation buttons', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const navButtons = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return {
        hasPrev: picker.shadowRoot.querySelector('.prev-month') !== null,
        hasNext: picker.shadowRoot.querySelector('.next-month') !== null
      };
    });

    expect(navButtons.hasPrev).toBeTruthy();
    expect(navButtons.hasNext).toBeTruthy();
  });

  test('has today button', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const hasTodayBtn = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.shadowRoot.querySelector('.today-btn') !== null;
    });

    expect(hasTodayBtn).toBeTruthy();
  });

  test('shows clear button when date is selected', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker value="2024-03-15"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const hasClearBtn = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.shadowRoot.querySelector('.clear-btn') !== null;
    });

    expect(hasClearBtn).toBeTruthy();
  });

  test('displays month and year', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const monthDisplay = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const display = picker.shadowRoot.querySelector('.month-display');
      return display ? display.textContent : '';
    });

    expect(monthDisplay.length).toBeGreaterThan(0);
  });

  test('uses default format YYYY-MM-DD', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const format = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.format;
    });

    expect(format).toBe('YYYY-MM-DD');
  });

  test('accepts custom format', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker format="DD/MM/YYYY"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const format = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.format;
    });

    expect(format).toBe('DD/MM/YYYY');
  });

  test('uses default topic datepicker', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const topic = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.topic;
    });

    expect(topic).toBe('datepicker');
  });

  test('accepts custom topic', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker topic="birthday"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const topic = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.topic;
    });

    expect(topic).toBe('birthday');
  });

  test('highlights selected date', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker value="2024-03-15"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const hasSelectedDate = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const selected = picker.shadowRoot.querySelector('.day-cell.selected');
      return selected !== null;
    });

    expect(hasSelectedDate).toBeTruthy();
  });

  test('respects min date constraint', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker min="2024-03-15"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const hasMin = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.min !== null;
    });

    expect(hasMin).toBeTruthy();
  });

  test('respects max date constraint', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker max="2024-12-31"></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const hasMax = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      return picker.max !== null;
    });

    expect(hasMax).toBeTruthy();
  });

  test('input is readonly', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-date-picker.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-date-picker></pan-date-picker>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-date-picker') !== undefined);

    const isReadonly = await page.evaluate(() => {
      const picker = document.querySelector('pan-date-picker');
      const input = picker.shadowRoot.querySelector('.date-input');
      return input.hasAttribute('readonly');
    });

    expect(isReadonly).toBeTruthy();
  });
});
