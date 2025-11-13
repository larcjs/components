// <pan-chart> — Chart wrapper with PAN integration
// Attributes:
//   - type: line, bar, pie, doughnut, radar, polarArea, scatter (default: line)
//   - data: JSON chart data
//   - options: JSON chart options
//   - topic: Topic prefix for events
//   - library: chart-js, custom (default: chart-js)
//   - width: Chart width (default: 100%)
//   - height: Chart height (default: 300px)
//
// Topics:
//   - Publishes: {topic}.ready { chart }
//   - Publishes: {topic}.click { dataPoint, datasetIndex, index }
//   - Publishes: {topic}.hover { dataPoint, datasetIndex, index }
//   - Subscribes: {topic}.update { data, options }
//   - Subscribes: {topic}.addData { label, data }
//   - Subscribes: {topic}.removeData { index }
//
// Notes:
//   - Requires Chart.js to be loaded: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
//   - For custom library, implement your own rendering via the 'custom-render' event

import { PanClient } from '../../../core/src/components/pan-client.mjs';

export class PanChart extends HTMLElement {
  static get observedAttributes() {
    return ['type', 'data', 'options', 'topic', 'library', 'width', 'height'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.chart = null;
  }

  connectedCallback() {
    this.render();
    this.setupTopics();
    this.initChart();
  }

  disconnectedCallback() {
    if (this.chart && this.chart.destroy) {
      this.chart.destroy();
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this.isConnected) return;

    if (name === 'data' || name === 'options' || name === 'type') {
      this.updateChart();
    } else {
      this.render();
    }
  }

  get type() { return this.getAttribute('type') || 'line'; }
  get data() {
    const dataAttr = this.getAttribute('data');
    if (!dataAttr) return this.getDefaultData();
    try {
      return JSON.parse(dataAttr);
    } catch (e) {
      console.error('Invalid data JSON:', e);
      return this.getDefaultData();
    }
  }
  get options() {
    const optionsAttr = this.getAttribute('options');
    if (!optionsAttr) return this.getDefaultOptions();
    try {
      return JSON.parse(optionsAttr);
    } catch (e) {
      console.error('Invalid options JSON:', e);
      return this.getDefaultOptions();
    }
  }
  get topic() { return this.getAttribute('topic') || 'chart'; }
  get library() { return this.getAttribute('library') || 'chart-js'; }
  get width() { return this.getAttribute('width') || '100%'; }
  get height() { return this.getAttribute('height') || '300px'; }

  getDefaultData() {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Sample Data',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4
      }]
    };
  }

  getDefaultOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataPoint = this.chart.data.datasets[datasetIndex].data[index];

          this.pc.publish({
            topic: `${this.topic}.click`,
            data: { dataPoint, datasetIndex, index }
          });
        }
      },
      onHover: (event, elements) => {
        if (elements.length > 0) {
          const element = elements[0];
          const datasetIndex = element.datasetIndex;
          const index = element.index;
          const dataPoint = this.chart.data.datasets[datasetIndex].data[index];

          this.pc.publish({
            topic: `${this.topic}.hover`,
            data: { dataPoint, datasetIndex, index }
          });
        }
      }
    };
  }

  setupTopics() {
    this.pc.subscribe(`${this.topic}.update`, (msg) => {
      if (msg.data.data) {
        this.setAttribute('data', JSON.stringify(msg.data.data));
      }
      if (msg.data.options) {
        this.setAttribute('options', JSON.stringify(msg.data.options));
      }
    });

    this.pc.subscribe(`${this.topic}.addData`, (msg) => {
      if (this.chart && msg.data.label && msg.data.data) {
        this.chart.data.labels.push(msg.data.label);
        this.chart.data.datasets.forEach((dataset, i) => {
          const value = Array.isArray(msg.data.data) ? msg.data.data[i] : msg.data.data;
          dataset.data.push(value);
        });
        this.chart.update();
      }
    });

    this.pc.subscribe(`${this.topic}.removeData`, (msg) => {
      if (this.chart && typeof msg.data.index === 'number') {
        this.chart.data.labels.splice(msg.data.index, 1);
        this.chart.data.datasets.forEach((dataset) => {
          dataset.data.splice(msg.data.index, 1);
        });
        this.chart.update();
      }
    });
  }

  async initChart() {
    const canvas = this.shadowRoot.querySelector('canvas');
    if (!canvas) return;

    if (this.library === 'chart-js') {
      // Check if Chart.js is loaded
      if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded. Please include: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>');
        canvas.parentElement.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: #ef4444;">
            <strong>Chart.js not loaded</strong><br>
            <small>Include Chart.js: &lt;script src="https://cdn.jsdelivr.net/npm/chart.js"&gt;&lt;/script&gt;</small>
          </div>
        `;
        return;
      }

      const ctx = canvas.getContext('2d');
      const config = {
        type: this.type,
        data: this.data,
        options: this.options
      };

      this.chart = new Chart(ctx, config);

      this.pc.publish({
        topic: `${this.topic}.ready`,
        data: { chart: this.chart }
      });
    } else if (this.library === 'custom') {
      // Dispatch custom render event for custom implementations
      this.dispatchEvent(new CustomEvent('custom-render', {
        detail: {
          canvas,
          data: this.data,
          options: this.options,
          type: this.type
        }
      }));
    }
  }

  updateChart() {
    if (!this.chart) {
      this.initChart();
      return;
    }

    if (this.library === 'chart-js') {
      this.chart.data = this.data;
      this.chart.options = this.options;
      this.chart.update();
    } else if (this.library === 'custom') {
      this.dispatchEvent(new CustomEvent('custom-update', {
        detail: {
          data: this.data,
          options: this.options
        }
      }));
    }
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: ${this.width};
          height: ${this.height};
        }

        .chart-container {
          width: 100%;
          height: 100%;
          position: relative;
          background: var(--chart-bg, #ffffff);
          border-radius: var(--chart-radius, 0.5rem);
          padding: var(--chart-padding, 1rem);
          box-sizing: border-box;
        }

        .chart-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
        }

        canvas {
          max-width: 100%;
          max-height: 100%;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--chart-loading-color, #94a3b8);
          font-size: 0.875rem;
        }
      </style>

      <div class="chart-container">
        <div class="chart-wrapper">
          <canvas></canvas>
        </div>
      </div>
    `;

    // Re-init chart after render
    if (this.isConnected) {
      setTimeout(() => this.initChart(), 0);
    }
  }
}

customElements.define('pan-chart', PanChart);
export default PanChart;
