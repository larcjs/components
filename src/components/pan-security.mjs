/**
 * @fileoverview PAN Security Utilities
 *
 * Security helpers for PAN framework:
 * - HTTPS enforcement
 * - XSS prevention
 * - Input sanitization
 * - Security best practices
 */

/**
 * Check if running in production and enforce HTTPS
 * @param {Object} options - Configuration options
 * @param {boolean} [options.enforce=true] - Whether to enforce HTTPS
 * @param {string[]} [options.allowedHosts=[]] - Hosts exempt from HTTPS (e.g., localhost)
 */
export function enforceHTTPS(options = {}) {
  const {
    enforce = true,
    allowedHosts = ['localhost', '127.0.0.1', '[::1]'],
  } = options;

  if (!enforce) return;

  // Check if we're on HTTPS or an allowed host
  const isHTTPS = location.protocol === 'https:';
  const hostname = location.hostname;
  const isAllowedHost = allowedHosts.some(host => hostname === host);

  if (!isHTTPS && !isAllowedHost) {
    console.error('🔒 PAN Security: HTTPS is required in production');
    console.error(`Current URL: ${location.href}`);
    console.error('Redirecting to HTTPS...');

    // Redirect to HTTPS
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
  }
}

/**
 * Sanitize HTML to prevent XSS
 * Basic implementation - use DOMPurify for production
 *
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';

  // Create a temporary div to parse HTML
  const temp = document.createElement('div');

  // Use textContent to escape all HTML
  temp.textContent = html;

  return temp.innerHTML;
}

/**
 * Safe innerHTML setter that sanitizes content
 *
 * @param {HTMLElement} element - Element to set content on
 * @param {string} html - HTML content (will be sanitized)
 */
export function safeSetHTML(element, html) {
  if (!element) return;

  // For now, use textContent as safest option
  // In production, integrate DOMPurify
  if (typeof html !== 'string') {
    element.textContent = '';
    return;
  }

  // Check if DOMPurify is available
  if (typeof window !== 'undefined' && window.DOMPurify) {
    element.innerHTML = window.DOMPurify.sanitize(html);
  } else {
    // Fallback: escape HTML
    element.textContent = html;
    console.warn('DOMPurify not available. Using textContent. Install DOMPurify for proper HTML sanitization.');
  }
}

/**
 * Create a safe text node (alternative to innerHTML)
 *
 * @param {string} text - Text content
 * @returns {Text} Text node
 */
export function createTextNode(text) {
  return document.createTextNode(text || '');
}

/**
 * Safely create an element with attributes
 *
 * @param {string} tag - Element tag name
 * @param {Object} attrs - Attributes to set
 * @param {string} content - Text content (not HTML)
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, content = '') {
  const element = document.createElement(tag);

  // Set attributes safely
  for (const [key, value] of Object.entries(attrs)) {
    // Skip event handlers
    if (key.startsWith('on')) {
      console.warn(`Skipping event handler attribute: ${key}`);
      continue;
    }

    // Skip dangerous attributes
    if (['innerHTML', 'outerHTML'].includes(key)) {
      console.warn(`Skipping dangerous attribute: ${key}`);
      continue;
    }

    element.setAttribute(key, value);
  }

  // Set text content (not HTML)
  if (content) {
    element.textContent = content;
  }

  return element;
}

/**
 * Validate URL to prevent javascript: and data: schemes
 *
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is safe
 */
export function isSafeURL(url) {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      console.warn(`Blocked dangerous URL protocol: ${protocol}`);
      return false;
    }
  }

  return true;
}

/**
 * Safely set element href (for links)
 *
 * @param {HTMLAnchorElement} element - Link element
 * @param {string} href - URL to set
 */
export function setSafeHref(element, href) {
  if (!element || !href) return;

  if (isSafeURL(href)) {
    element.href = href;
  } else {
    console.error('Blocked unsafe URL:', href);
    element.href = '#';
  }
}

/**
 * Check if Content Security Policy is properly configured
 *
 * @returns {Object} CSP status
 */
export function checkCSP() {
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  const cspHeader = document.querySelector('meta[name="Content-Security-Policy"]');

  const hasCSP = !!(cspMeta || cspHeader);

  if (!hasCSP) {
    console.warn('⚠ PAN Security: No Content-Security-Policy found');
    console.warn('Add CSP meta tag or header for better security');
  }

  return {
    configured: hasCSP,
    meta: cspMeta ? cspMeta.content : null,
    header: cspHeader ? cspHeader.content : null,
  };
}

/**
 * Initialize PAN security features
 *
 * @param {Object} options - Configuration options
 */
export function initSecurity(options = {}) {
  const {
    enforceHTTPS: shouldEnforceHTTPS = true,
    checkCSP: shouldCheckCSP = true,
  } = options;

  console.log('🛡️ PAN Security initializing...');

  // Enforce HTTPS
  if (shouldEnforceHTTPS) {
    enforceHTTPS();
  }

  // Check CSP
  if (shouldCheckCSP) {
    checkCSP();
  }

  console.log('✓ PAN Security initialized');
}

/**
 * Escape HTML special characters
 *
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
  if (!text || typeof text !== 'string') return '';

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Strip all HTML tags from a string
 *
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export function stripHTML(html) {
  if (!html || typeof html !== 'string') return '';

  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || '';
}

export default {
  enforceHTTPS,
  sanitizeHTML,
  safeSetHTML,
  createTextNode,
  createElement,
  isSafeURL,
  setSafeHref,
  checkCSP,
  initSecurity,
  escapeHTML,
  stripHTML,
};
