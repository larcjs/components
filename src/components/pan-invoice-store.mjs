/**
 * pan-invoice-store
 *
 * Centralized state management for invoice application.
 * Handles localStorage persistence, invoice management, and coordinates
 * state between all invoice components via PAN.
 *
 * Features:
 * - LocalStorage persistence with encryption support
 * - Multiple invoice management (create, load, save, delete)
 * - Auto-save on changes
 * - Import/Export JSON
 * - Coordinates state via PAN bus
 *
 * PAN Events (subscribed):
 * - invoice.header.changed
 * - invoice.items.changed
 * - invoice.total.calculated
 * - invoice.save
 * - invoice.load-by-id
 * - invoice.new
 * - invoice.delete
 * - invoice.export
 * - invoice.import
 *
 * PAN Events (published):
 * - invoice.load: { header, items, totals }
 * - invoice.saved: { id, timestamp }
 * - invoice.list-updated: { invoices }
 * - invoice.current-changed: { id, invoice }
 *
 * Usage:
 *   <pan-invoice-store auto-save="true"></pan-invoice-store>
 */

export class PanInvoiceStore extends HTMLElement {
  static observedAttributes = ['auto-save'];

  constructor() {
    super();
    this._currentInvoiceId = null;
    this._currentInvoice = this._getEmptyInvoice();
    this._autoSave = true;
    this._saveDebounceTimer = null;
    this._storageKey = 'pan-invoices';
  }

  connectedCallback() {
    this._autoSave = this.hasAttribute('auto-save') ?
      this.getAttribute('auto-save') !== 'false' : true;

    this._setupPanListeners();
    this._loadInvoicesList();

    // Load last invoice or create new one
    const invoices = this._getAllInvoices();
    if (invoices.length > 0) {
      const lastId = localStorage.getItem('pan-invoice-last-id');
      const lastInvoice = invoices.find(inv => inv.id === lastId) || invoices[0];
      this._loadInvoice(lastInvoice.id);
    } else {
      this._createNewInvoice();
    }
  }

  _setupPanListeners() {
    const bus = document.querySelector('pan-bus');
    if (!bus) return;

    // Subscribe to component changes
    bus.subscribe('invoice.header.changed', (data) => {
      this._currentInvoice.header = data;
      this._markModified();
      if (this._autoSave) this._debounceSave();
    });

    bus.subscribe('invoice.items.changed', (data) => {
      this._currentInvoice.items = data.items;
      this._markModified();
      if (this._autoSave) this._debounceSave();
    });

    bus.subscribe('invoice.total.calculated', (data) => {
      this._currentInvoice.totals = data;
      this._markModified();
      if (this._autoSave) this._debounceSave();
    });

    // Command handlers
    bus.subscribe('invoice.save', () => {
      this._saveCurrentInvoice();
    });

    bus.subscribe('invoice.load-by-id', (data) => {
      if (data.id) this._loadInvoice(data.id);
    });

    bus.subscribe('invoice.new', () => {
      this._createNewInvoice();
    });

    bus.subscribe('invoice.delete', (data) => {
      const id = data.id || this._currentInvoiceId;
      if (id) this._deleteInvoice(id);
    });

    bus.subscribe('invoice.export', () => {
      this._exportInvoice();
    });

    bus.subscribe('invoice.import', (data) => {
      if (data.json) this._importInvoice(data.json);
    });

    bus.subscribe('invoice.export-all', () => {
      this._exportAllInvoices();
    });

    bus.subscribe('invoice.clear', () => {
      this._currentInvoice = this._getEmptyInvoice();
      this._broadcastInvoice();
    });
  }

  _getEmptyInvoice() {
    return {
      id: this._generateId(),
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      header: {
        from: { name: '', address: '', city: '', phone: '', email: '' },
        to: { name: '', address: '', city: '', phone: '', email: '' },
        invoiceNumber: '',
        invoiceDate: new Date().toLocaleDateString('en-US'),
        dueDate: ''
      },
      items: [],
      totals: {
        subtotal: 0,
        tax: 0,
        taxRate: 0,
        total: 0,
        notes: ''
      }
    };
  }

  _createNewInvoice() {
    // Save current if modified
    if (this._currentInvoice.modified) {
      this._saveCurrentInvoice();
    }

    this._currentInvoice = this._getEmptyInvoice();
    this._currentInvoiceId = this._currentInvoice.id;

    // Try to preserve "from" info from last invoice
    const invoices = this._getAllInvoices();
    if (invoices.length > 0) {
      const lastInvoice = invoices[invoices.length - 1];
      if (lastInvoice.header?.from) {
        this._currentInvoice.header.from = { ...lastInvoice.header.from };
      }
      if (lastInvoice.totals?.taxRate) {
        this._currentInvoice.totals.taxRate = lastInvoice.totals.taxRate;
      }
    }

    this._broadcastInvoice();
    this._broadcastInvoicesList();
    this._publishEvent('invoice.current-changed', {
      id: this._currentInvoiceId,
      invoice: this._currentInvoice
    });
  }

  _loadInvoice(id) {
    const invoices = this._getAllInvoices();
    const invoice = invoices.find(inv => inv.id === id);

    if (invoice) {
      this._currentInvoice = invoice;
      this._currentInvoiceId = id;
      localStorage.setItem('pan-invoice-last-id', id);

      this._broadcastInvoice();
      this._publishEvent('invoice.current-changed', {
        id: this._currentInvoiceId,
        invoice: this._currentInvoice
      });
    }
  }

  _saveCurrentInvoice() {
    const invoices = this._getAllInvoices();
    const existingIndex = invoices.findIndex(inv => inv.id === this._currentInvoiceId);

    this._currentInvoice.modified = new Date().toISOString();

    if (existingIndex >= 0) {
      invoices[existingIndex] = this._currentInvoice;
    } else {
      invoices.push(this._currentInvoice);
    }

    this._saveAllInvoices(invoices);
    this._broadcastInvoicesList();
    this._publishEvent('invoice.saved', {
      id: this._currentInvoiceId,
      timestamp: this._currentInvoice.modified
    });
  }

  _deleteInvoice(id) {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    const invoices = this._getAllInvoices();
    const filtered = invoices.filter(inv => inv.id !== id);

    this._saveAllInvoices(filtered);

    // If deleting current invoice, load another or create new
    if (id === this._currentInvoiceId) {
      if (filtered.length > 0) {
        this._loadInvoice(filtered[0].id);
      } else {
        this._createNewInvoice();
      }
    }

    this._broadcastInvoicesList();
  }

  _exportInvoice() {
    const json = JSON.stringify(this._currentInvoice, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${this._currentInvoice.header.invoiceNumber || this._currentInvoiceId}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  _exportAllInvoices() {
    const invoices = this._getAllInvoices();
    const json = JSON.stringify(invoices, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `all-invoices-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
  }

  _importInvoice(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;

      if (Array.isArray(data)) {
        // Import multiple invoices
        const invoices = this._getAllInvoices();
        data.forEach(invoice => {
          invoice.id = invoice.id || this._generateId();
          const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
          if (existingIndex >= 0) {
            invoices[existingIndex] = invoice;
          } else {
            invoices.push(invoice);
          }
        });
        this._saveAllInvoices(invoices);
        this._loadInvoice(data[0].id);
      } else {
        // Import single invoice
        data.id = data.id || this._generateId();
        const invoices = this._getAllInvoices();
        invoices.push(data);
        this._saveAllInvoices(invoices);
        this._loadInvoice(data.id);
      }

      this._broadcastInvoicesList();
    } catch (error) {
      console.error('Failed to import invoice:', error);
      this._publishEvent('invoice.error', { message: 'Failed to import invoice', error });
    }
  }

  _broadcastInvoice() {
    const bus = document.querySelector('pan-bus');
    if (bus) {
      bus.publish('invoice.load', this._currentInvoice);
    }
  }

  _broadcastInvoicesList() {
    const invoices = this._getAllInvoices();
    const list = invoices.map(inv => ({
      id: inv.id,
      invoiceNumber: inv.header?.invoiceNumber || 'Untitled',
      customerName: inv.header?.to?.name || 'No customer',
      date: inv.header?.invoiceDate || inv.created,
      total: inv.totals?.total || 0,
      created: inv.created,
      modified: inv.modified
    }));

    this._publishEvent('invoice.list-updated', { invoices: list });
  }

  _loadInvoicesList() {
    this._broadcastInvoicesList();
  }

  _markModified() {
    // Mark as modified without saving yet
    this._currentInvoice.modified = new Date().toISOString();
  }

  _debounceSave() {
    clearTimeout(this._saveDebounceTimer);
    this._saveDebounceTimer = setTimeout(() => {
      this._saveCurrentInvoice();
    }, 1000); // Save 1 second after last change
  }

  _getAllInvoices() {
    try {
      const data = localStorage.getItem(this._storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load invoices:', error);
      return [];
    }
  }

  _saveAllInvoices(invoices) {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(invoices));
    } catch (error) {
      console.error('Failed to save invoices:', error);
      this._publishEvent('invoice.error', { message: 'Failed to save to localStorage', error });
    }
  }

  _generateId() {
    return `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _publishEvent(topic, data) {
    const bus = document.querySelector('pan-bus');
    if (bus) {
      bus.publish(topic, data);
    }
  }

  // Public API
  getCurrentInvoice() {
    return this._currentInvoice;
  }

  getAllInvoices() {
    return this._getAllInvoices();
  }

  save() {
    this._saveCurrentInvoice();
  }

  load(id) {
    this._loadInvoice(id);
  }

  createNew() {
    this._createNewInvoice();
  }
}

customElements.define('pan-invoice-store', PanInvoiceStore);
export default PanInvoiceStore;
