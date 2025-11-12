/**
 * Test Runner - Wrapper for Playwright Test
 * Provides test framework utilities for component testing
 */

import { test as playwrightTest, expect as playwrightExpect } from '@playwright/test';

/**
 * Test suite grouping
 */
export function describe(name, fn) {
  playwrightTest.describe(name, fn);
}

/**
 * Individual test case
 */
export const test = playwrightTest;

/**
 * Assertion library
 */
export const expect = playwrightExpect;

/**
 * Before all tests in a suite
 */
export function beforeAll(fn) {
  playwrightTest.beforeAll(fn);
}

/**
 * After all tests in a suite
 */
export function afterAll(fn) {
  playwrightTest.afterAll(fn);
}

/**
 * Before each test in a suite
 */
export function beforeEach(fn) {
  playwrightTest.beforeEach(fn);
}

/**
 * After each test in a suite
 */
export function afterEach(fn) {
  playwrightTest.afterEach(fn);
}
