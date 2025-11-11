/**
 * TypeScript definitions for pan-validation.mjs
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface PanMessage<T = unknown> {
  topic: string;
  data: T;
  id?: string;
  ts?: number;
  retain?: boolean;
  replyTo?: string;
  correlationId?: string;
  headers?: Record<string, string>;
}

export function isSerializable(data: unknown): boolean;

export function checkSerializable(data: unknown): ValidationResult;

export function estimateSize(obj: unknown): number;

export function validateTopic(topic: string): ValidationResult;

export function validatePattern(
  pattern: string,
  options?: {
    allowGlobalWildcard?: boolean;
    maxWildcards?: number;
  }
): ValidationResult;

export function validateMessage(
  message: PanMessage,
  limits?: {
    maxMessageSize?: number;
    maxPayloadSize?: number;
  }
): ValidationResult;

export function isElementAlive(el: Element): boolean;

export function sanitizeError(error: unknown): string;

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
