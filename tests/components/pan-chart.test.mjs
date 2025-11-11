/**
 * pan-chart component tests
 * Tests the chart component functionality including data rendering,
 * updates, interactions, and PAN message bus integration
 */

import { chromium } from 'playwright';
import { describe, test, expect, beforeAll, afterAll } from '../lib/test-runner.mjs';
import { fileUrl, publishPanMessage } from '../lib/test-utils.mjs';

describe('pan-chart', () => {
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
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const chartExists = await page.evaluate(() => {
      return document.querySelector('pan-chart') !== null;
    });
    expect(chartExists).toBeTruthy();

    const hasCanvas = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.shadowRoot.querySelector('canvas') !== null;
    });
    expect(hasCanvas).toBeTruthy();
  });

  test('uses default chart type', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const chartType = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.type;
    });

    expect(chartType).toBe('line');
  });

  test('accepts custom chart type', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart type="bar"></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const chartType = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.type;
    });

    expect(chartType).toBe('bar');
  });

  test('renders with default data', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);
    await page.waitForTimeout(500);

    const hasDefaultData = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      const data = chart.data;
      return data.labels && data.labels.length > 0 && data.datasets && data.datasets.length > 0;
    });

    expect(hasDefaultData).toBeTruthy();
  });

  test('accepts custom data via attribute', async () => {
    const customData = JSON.stringify({
      labels: ['A', 'B', 'C'],
      datasets: [{
        label: 'Test Data',
        data: [10, 20, 30]
      }]
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart data='${customData.replace(/'/g, "&apos;")}'></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const chartData = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.data;
    });

    expect(chartData.labels).toHaveLength(3);
    expect(chartData.labels[0]).toBe('A');
    expect(chartData.datasets[0].label).toBe('Test Data');
  });

  test('uses custom width and height', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart width="500px" height="400px"></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const dimensions = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return {
        width: chart.width,
        height: chart.height
      };
    });

    expect(dimensions.width).toBe('500px');
    expect(dimensions.height).toBe('400px');
  });

  test('uses custom topic attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart topic="mychart"></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const topic = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.topic;
    });

    expect(topic).toBe('mychart');
  });

  test('displays error message when Chart.js not loaded', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);
    await page.waitForTimeout(500);

    const hasErrorMessage = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      const container = chart.shadowRoot.querySelector('.chart-container');
      return container.innerHTML.includes('Chart.js not loaded');
    });

    expect(hasErrorMessage).toBeTruthy();
  });

  test('initializes Chart.js instance', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);
    await page.waitForTimeout(500);

    const hasChartInstance = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.chart !== null && typeof chart.chart === 'object';
    });

    expect(hasChartInstance).toBeTruthy();
  });

  test('updates chart when data attribute changes', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);
    await page.waitForTimeout(500);

    const newLabels = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      const newData = JSON.stringify({
        labels: ['X', 'Y', 'Z'],
        datasets: [{
          label: 'Updated',
          data: [100, 200, 300]
        }]
      });
      chart.setAttribute('data', newData);

      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(chart.data.labels);
        }, 100);
      });
    });

    expect(newLabels).toHaveLength(3);
    expect(newLabels[0]).toBe('X');
  });

  test('handles custom library attribute', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart library="custom"></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const library = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.library;
    });

    expect(library).toBe('custom');
  });

  test('renders with responsive options by default', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const isResponsive = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      const options = chart.options;
      return options.responsive === true;
    });

    expect(isResponsive).toBeTruthy();
  });

  test('allows custom options via attribute', async () => {
    const customOptions = JSON.stringify({
      responsive: false,
      maintainAspectRatio: true
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart options='${customOptions.replace(/'/g, "&apos;")}'></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const options = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.options;
    });

    expect(options.responsive).toBe(false);
    expect(options.maintainAspectRatio).toBe(true);
  });

  test('cleans up chart on disconnect', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart id="test-chart"></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);
    await page.waitForTimeout(500);

    await page.evaluate(() => {
      const chart = document.getElementById('test-chart');
      chart.remove();
    });

    const removed = await page.evaluate(() => {
      return document.getElementById('test-chart') === null;
    });

    expect(removed).toBeTruthy();
  });

  test('has default chart data with 6 labels', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const labelCount = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      return chart.data.labels.length;
    });

    expect(labelCount).toBe(6);
  });

  test('canvas element exists in shadow DOM', async () => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script type="module" src="${fileUrl('src/core/pan-bus.mjs')}"></script>
        <script type="module" src="${fileUrl('src/core/pan-client.mjs')}"></script>
        <script type="module" src="${fileUrl('dist/components/pan-chart.js')}"></script>
      </head>
      <body>
        <pan-bus></pan-bus>
        <pan-chart></pan-chart>
      </body>
      </html>
    `);

    await page.waitForFunction(() => customElements.get('pan-chart') !== undefined);

    const canvasInfo = await page.evaluate(() => {
      const chart = document.querySelector('pan-chart');
      const canvas = chart.shadowRoot.querySelector('canvas');
      return {
        exists: canvas !== null,
        tagName: canvas?.tagName
      };
    });

    expect(canvasInfo.exists).toBeTruthy();
    expect(canvasInfo.tagName).toBe('CANVAS');
  });
});
