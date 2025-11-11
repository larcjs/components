// Alias wrapper for PanDataTable with <pan-table> tag
import PanDataTable from './pan-data-table.js';

// Define an alias custom element if not already defined
try { if (!customElements.get('pan-table')) customElements.define('pan-table', /** @type {any} */(PanDataTable)); } catch {}

export { PanDataTable };
export default PanDataTable;

