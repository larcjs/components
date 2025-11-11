/**
 * @fileoverview PAN Validation Utilities
 *
 * Shared validation functions for message and topic validation
 * Used by both PAN Bus and PAN Client for consistency
 */

/**
 * Check if data is JSON-serializable
 * @param {*} data - Data to check
 * @returns {boolean} True if serializable
 */
export function isSerializable(data) {
  try {
    JSON.stringify(data);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get detailed reason why data is not serializable
 * @param {*} data - Data to check
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function checkSerializable(data) {
  // Undefined is okay
  if (data === undefined) {
    return { valid: true };
  }

  // Check for common non-serializable types
  if (typeof data === 'function') {
    return { valid: false, error: 'Functions cannot be serialized' };
  }

  if (data instanceof Node || data instanceof Element) {
    return { valid: false, error: 'DOM nodes cannot be serialized' };
  }

  if (data instanceof Window) {
    return { valid: false, error: 'Window objects cannot be serialized' };
  }

  // Try serialization
  try {
    JSON.stringify(data);
    return { valid: true };
  } catch (e) {
    if (e.message.includes('circular')) {
      return { valid: false, error: 'Circular references are not allowed' };
    }
    if (e.message.includes('BigInt')) {
      return { valid: false, error: 'BigInt values are not JSON-serializable (convert to string first)' };
    }
    return { valid: false, error: `Serialization error: ${e.message}` };
  }
}

/**
 * Estimate size of object in bytes
 * @param {*} obj - Object to measure
 * @returns {number} Approximate size in bytes
 */
export function estimateSize(obj) {
  try {
    const json = JSON.stringify(obj);
    return new Blob([json]).size;
  } catch (e) {
    return 0;
  }
}

/**
 * Validate topic string
 * @param {string} topic - Topic to validate
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateTopic(topic) {
  if (!topic || typeof topic !== 'string') {
    return { valid: false, error: 'Topic must be a non-empty string' };
  }

  if (topic.length > 256) {
    return { valid: false, error: 'Topic must be less than 256 characters' };
  }

  // Check for invalid characters
  if (!/^[a-z0-9:.*_-]+$/i.test(topic)) {
    return {
      valid: false,
      error: 'Topic can only contain letters, numbers, dots, colons, hyphens, underscores, and asterisks'
    };
  }

  // Check for consecutive dots
  if (topic.includes('..')) {
    return { valid: false, error: 'Topic cannot contain consecutive dots' };
  }

  // Check for leading/trailing dots
  if (topic.startsWith('.') || topic.endsWith('.')) {
    return { valid: false, error: 'Topic cannot start or end with a dot' };
  }

  return { valid: true };
}

/**
 * Validate subscription pattern
 * @param {string} pattern - Pattern to validate
 * @param {Object} options - Validation options
 * @param {boolean} [options.allowGlobalWildcard=true] - Allow '*' pattern
 * @param {number} [options.maxWildcards=5] - Max wildcard segments
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validatePattern(pattern, options = {}) {
  const {
    allowGlobalWildcard = true,
    maxWildcards = 5
  } = options;

  // First validate as topic
  const topicValidation = validateTopic(pattern);
  if (!topicValidation.valid) {
    return topicValidation;
  }

  // Check global wildcard
  if (pattern === '*') {
    if (!allowGlobalWildcard) {
      return {
        valid: false,
        error: 'Global wildcard (*) is disabled for security reasons'
      };
    }
    return { valid: true };
  }

  // Count wildcards
  const wildcardCount = (pattern.match(/\*/g) || []).length;
  if (wildcardCount > maxWildcards) {
    return {
      valid: false,
      error: `Too many wildcards (${wildcardCount}), maximum is ${maxWildcards}`
    };
  }

  // Check for wildcard positioning
  const segments = pattern.split('.');
  for (const segment of segments) {
    if (segment.includes('*') && segment !== '*') {
      return {
        valid: false,
        error: 'Wildcards must be a complete segment (use "users.*" not "users.u*")'
      };
    }
  }

  return { valid: true };
}

/**
 * Validate complete PAN message
 * @param {Object} msg - Message to validate
 * @param {Object} limits - Size limits
 * @param {number} [limits.maxMessageSize=1048576] - Max total message size
 * @param {number} [limits.maxPayloadSize=524288] - Max data payload size
 * @returns {{valid: boolean, error?: string}} Validation result
 */
export function validateMessage(msg, limits = {}) {
  const {
    maxMessageSize = 1048576,
    maxPayloadSize = 524288
  } = limits;

  // Check topic
  const topicValidation = validateTopic(msg.topic);
  if (!topicValidation.valid) {
    return topicValidation;
  }

  // Check data serialization
  const dataValidation = checkSerializable(msg.data);
  if (!dataValidation.valid) {
    return { valid: false, error: `Data validation failed: ${dataValidation.error}` };
  }

  // Check message size
  const msgSize = estimateSize(msg);
  if (msgSize > maxMessageSize) {
    return {
      valid: false,
      error: `Message size (${msgSize} bytes) exceeds limit (${maxMessageSize} bytes)`
    };
  }

  // Check payload size
  const dataSize = estimateSize(msg.data);
  if (dataSize > maxPayloadSize) {
    return {
      valid: false,
      error: `Payload size (${dataSize} bytes) exceeds limit (${maxPayloadSize} bytes)`
    };
  }

  // Validate optional fields
  if (msg.id !== undefined && typeof msg.id !== 'string') {
    return { valid: false, error: 'Message id must be a string' };
  }

  if (msg.ts !== undefined && typeof msg.ts !== 'number') {
    return { valid: false, error: 'Message timestamp must be a number' };
  }

  if (msg.retain !== undefined && typeof msg.retain !== 'boolean') {
    return { valid: false, error: 'Message retain must be a boolean' };
  }

  if (msg.replyTo !== undefined) {
    const replyToValidation = validateTopic(msg.replyTo);
    if (!replyToValidation.valid) {
      return { valid: false, error: `Invalid replyTo: ${replyToValidation.error}` };
    }
  }

  if (msg.correlationId !== undefined && typeof msg.correlationId !== 'string') {
    return { valid: false, error: 'Message correlationId must be a string' };
  }

  if (msg.headers !== undefined) {
    if (typeof msg.headers !== 'object' || Array.isArray(msg.headers)) {
      return { valid: false, error: 'Message headers must be an object' };
    }
    // Validate headers are all strings
    for (const [key, value] of Object.entries(msg.headers)) {
      if (typeof value !== 'string') {
        return { valid: false, error: `Header "${key}" must be a string value` };
      }
    }
  }

  return { valid: true };
}

/**
 * Check if element is still alive in DOM
 * @param {Element} el - Element to check
 * @returns {boolean} True if element is in DOM
 */
export function isElementAlive(el) {
  if (!el) return false;
  if (!el.isConnected) return false;
  return document.contains(el) || document.body.contains(el);
}

/**
 * Sanitize error message for safe display
 * @param {*} error - Error to sanitize
 * @returns {string} Safe error message
 */
export function sanitizeError(error) {
  if (!error) return 'Unknown error';

  if (typeof error === 'string') {
    // Remove potential sensitive data patterns
    return error.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
                .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[card]')
                .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn]');
  }

  if (error instanceof Error) {
    return sanitizeError(error.message);
  }

  try {
    return sanitizeError(String(error));
  } catch (e) {
    return 'Error cannot be displayed';
  }
}

export default {
  isSerializable,
  checkSerializable,
  estimateSize,
  validateTopic,
  validatePattern,
  validateMessage,
  isElementAlive,
  sanitizeError
};
