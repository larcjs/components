// <pan-date-picker> — Date picker with calendar and PAN integration
// Attributes:
//   - value: Selected date (YYYY-MM-DD format)
//   - format: Display format (default: YYYY-MM-DD)
//   - min: Minimum date
//   - max: Maximum date
//   - topic: Topic prefix for events
//   - placeholder: Input placeholder
//
// Topics:
//   - Publishes: {topic}.change { date, formatted }
//   - Subscribes: {topic}.setValue { date }

import { PanClient } from './pan-client.mjs';

export class PanDatePicker extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'format', 'min', 'max', 'topic', 'placeholder'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.pc = new PanClient(this);
    this.isOpen = false;
    this.currentMonth = new Date();
    this.selectedDate = null;
  }

  connectedCallback() {
    if (this.value) {
      this.selectedDate = new Date(this.value);
      this.currentMonth = new Date(this.selectedDate);
    }
    this.render();
    this.setupTopics();
    this.setupEvents();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'value' && newVal && !this.isOpen) {
      this.selectedDate = new Date(newVal);
      this.currentMonth = new Date(this.selectedDate);
    }
    if (this.isConnected) this.render();
  }

  get value() { return this.getAttribute('value') || ''; }
  set value(val) { this.setAttribute('value', val); }
  get format() { return this.getAttribute('format') || 'YYYY-MM-DD'; }
  get min() { return this.getAttribute('min') ? new Date(this.getAttribute('min')) : null; }
  get max() { return this.getAttribute('max') ? new Date(this.getAttribute('max')) : null; }
  get topic() { return this.getAttribute('topic') || 'datepicker'; }
  get placeholder() { return this.getAttribute('placeholder') || 'Select date'; }

  setupTopics() {
    this.pc.subscribe(`${this.topic}.setValue`, (msg) => {
      if (msg.data.date) {
        this.selectDate(new Date(msg.data.date));
      }
    });
  }

  setupEvents() {
    const input = this.shadowRoot.querySelector('.date-input');
    const calendar = this.shadowRoot.querySelector('.calendar');
    const prevBtn = this.shadowRoot.querySelector('.prev-month');
    const nextBtn = this.shadowRoot.querySelector('.next-month');
    const todayBtn = this.shadowRoot.querySelector('.today-btn');
    const clearBtn = this.shadowRoot.querySelector('.clear-btn');

    if (input) {
      input.addEventListener('click', () => this.toggleCalendar());
      input.addEventListener('focus', () => this.openCalendar());
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.changeMonth(-1));
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.changeMonth(1));
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => this.selectDate(new Date()));
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectDate(null);
      });
    }

    // Day cells
    this.shadowRoot.querySelectorAll('.day-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', () => {
        const date = new Date(cell.dataset.date);
        this.selectDate(date);
      });
    });

    // Close on outside click
    this.handleOutsideClick = (e) => {
      if (!this.contains(e.target) && this.isOpen) {
        this.closeCalendar();
      }
    };
    document.addEventListener('click', this.handleOutsideClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.handleOutsideClick);
  }

  toggleCalendar() {
    this.isOpen ? this.closeCalendar() : this.openCalendar();
  }

  openCalendar() {
    this.isOpen = true;
    const calendar = this.shadowRoot.querySelector('.calendar');
    if (calendar) calendar.classList.add('active');
  }

  closeCalendar() {
    this.isOpen = false;
    const calendar = this.shadowRoot.querySelector('.calendar');
    if (calendar) calendar.classList.remove('active');
  }

  changeMonth(delta) {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + delta, 1);
    this.renderCalendar();
  }

  selectDate(date) {
    this.selectedDate = date;
    if (date) {
      const isoDate = this.toISODate(date);
      this.value = isoDate;

      this.pc.publish({
        topic: `${this.topic}.change`,
        data: {
          date: isoDate,
          formatted: this.formatDate(date)
        }
      });
    } else {
      this.value = '';
      this.pc.publish({
        topic: `${this.topic}.change`,
        data: { date: null, formatted: '' }
      });
    }

    this.closeCalendar();
    this.render();
  }

  toISODate(date) {
    return date.toISOString().split('T')[0];
  }

  formatDate(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return this.format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('M', date.getMonth() + 1)
      .replace('D', date.getDate());
  }

  isDateDisabled(date) {
    if (this.min && date < this.min) return true;
    if (this.max && date > this.max) return true;
    return false;
  }

  getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  getFirstDayOfMonth(year, month) {
    return new Date(year, month, 1).getDay();
  }

  renderCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const daysInMonth = this.getDaysInMonth(year, month);
    const firstDay = this.getFirstDayOfMonth(year, month);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];

    const calendarGrid = this.shadowRoot.querySelector('.calendar-grid');
    const monthDisplay = this.shadowRoot.querySelector('.month-display');

    if (monthDisplay) {
      monthDisplay.textContent = `${monthNames[month]} ${year}`;
    }

    if (!calendarGrid) return;

    let html = '<div class="weekdays">';
    ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].forEach(day => {
      html += `<div class="weekday">${day}</div>`;
    });
    html += '</div><div class="days">';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="day-cell empty"></div>';
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isoDate = this.toISODate(date);
      const isSelected = this.selectedDate && this.toISODate(this.selectedDate) === isoDate;
      const isToday = this.toISODate(new Date()) === isoDate;
      const isDisabled = this.isDateDisabled(date);

      let classes = 'day-cell';
      if (isSelected) classes += ' selected';
      if (isToday) classes += ' today';
      if (isDisabled) classes += ' disabled';

      html += `<div class="${classes}" data-date="${isoDate}">${day}</div>`;
    }

    html += '</div>';
    calendarGrid.innerHTML = html;

    // Re-attach events for day cells
    setTimeout(() => {
      this.shadowRoot.querySelectorAll('.day-cell[data-date]').forEach(cell => {
        cell.addEventListener('click', () => {
          const date = new Date(cell.dataset.date);
          if (!this.isDateDisabled(date)) {
            this.selectDate(date);
          }
        });
      });
    }, 0);
  }

  render() {
    const displayValue = this.selectedDate ? this.formatDate(this.selectedDate) : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
        }

        .date-input-wrapper {
          position: relative;
        }

        .date-input {
          width: 100%;
          padding: 0.625rem 2.5rem 0.625rem 0.75rem;
          border: 1px solid var(--date-border, #e2e8f0);
          border-radius: 0.5rem;
          font-family: inherit;
          font-size: 0.95rem;
          background: var(--date-bg, #ffffff);
          color: var(--date-color, #1e293b);
          cursor: pointer;
          transition: all 0.2s;
        }

        .date-input:focus {
          outline: none;
          border-color: var(--date-focus-border, #6366f1);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .date-input.empty {
          color: var(--date-placeholder-color, #94a3b8);
        }

        .input-icons {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          gap: 0.25rem;
        }

        .icon-btn {
          display: flex;
          align-items: center;
          padding: 0.25rem;
          border: none;
          background: transparent;
          cursor: pointer;
          color: var(--date-icon-color, #64748b);
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .icon-btn:hover {
          color: var(--date-icon-hover, #1e293b);
        }

        .calendar {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          background: var(--calendar-bg, #ffffff);
          border: 1px solid var(--calendar-border, #e2e8f0);
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-10px);
          transition: all 0.2s;
          min-width: 280px;
        }

        .calendar.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .month-display {
          font-weight: 600;
          color: var(--calendar-header-color, #1e293b);
        }

        .month-nav {
          display: flex;
          gap: 0.5rem;
        }

        .nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          border-radius: 0.375rem;
          cursor: pointer;
          color: var(--calendar-nav-color, #64748b);
          transition: all 0.2s;
        }

        .nav-btn:hover {
          background: var(--calendar-nav-hover, #f1f5f9);
          color: var(--calendar-nav-hover-color, #1e293b);
        }

        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .weekday {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--calendar-weekday-color, #64748b);
          padding: 0.25rem;
        }

        .days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.25rem;
        }

        .day-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--calendar-day-color, #1e293b);
          transition: all 0.2s;
        }

        .day-cell:not(.empty):not(.disabled):hover {
          background: var(--calendar-day-hover, #f1f5f9);
        }

        .day-cell.empty {
          cursor: default;
        }

        .day-cell.today {
          font-weight: 600;
          color: var(--calendar-today-color, #6366f1);
        }

        .day-cell.selected {
          background: var(--calendar-selected-bg, #6366f1);
          color: white;
          font-weight: 600;
        }

        .day-cell.disabled {
          color: var(--calendar-disabled-color, #cbd5e1);
          cursor: not-allowed;
        }

        .calendar-footer {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--calendar-border, #e2e8f0);
        }

        .footer-btn {
          flex: 1;
          padding: 0.5rem;
          border: 1px solid var(--calendar-border, #e2e8f0);
          background: transparent;
          border-radius: 0.375rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 0.875rem;
          color: var(--calendar-btn-color, #64748b);
          transition: all 0.2s;
        }

        .footer-btn:hover {
          background: var(--calendar-btn-hover, #f1f5f9);
          border-color: var(--calendar-btn-hover-border, #cbd5e1);
        }
      </style>

      <div class="date-input-wrapper">
        <input
          type="text"
          class="date-input ${!displayValue ? 'empty' : ''}"
          value="${displayValue}"
          placeholder="${this.placeholder}"
          readonly
        >
        <div class="input-icons">
          ${displayValue ? `<button class="icon-btn clear-btn" title="Clear">✕</button>` : ''}
          <span class="icon-btn">📅</span>
        </div>
      </div>

      <div class="calendar">
        <div class="calendar-header">
          <span class="month-display"></span>
          <div class="month-nav">
            <button class="nav-btn prev-month">‹</button>
            <button class="nav-btn next-month">›</button>
          </div>
        </div>
        <div class="calendar-grid"></div>
        <div class="calendar-footer">
          <button class="footer-btn today-btn">Today</button>
        </div>
      </div>
    `;

    // Render calendar
    this.renderCalendar();

    // Re-setup events after render
    if (this.isConnected) {
      setTimeout(() => this.setupEvents(), 0);
    }
  }
}

customElements.define('pan-date-picker', PanDatePicker);
export default PanDatePicker;
