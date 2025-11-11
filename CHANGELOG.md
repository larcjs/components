# Changelog

All notable changes to this project will be documented in this file.

This project adheres to Keep a Changelog, and aims to follow Semantic Versioning.

## [Unreleased]

### 🔒 Security

- **Security audit completed** - Comprehensive audit of all high-risk UI components
  - ✅ pan-markdown-renderer (XSS reviewed)
  - ✅ pan-files (path traversal immune via OPFS)
  - ✅ pan-form (secure-by-design)
  - ✅ pan-php-connector (defense-in-depth with backend)
  - ✅ pan-graphql-connector (variables-based queries)
  - **Result:** 0 critical vulnerabilities found
  - **Status:** All components approved for production use
  - See [COMPONENT_SECURITY_AUDIT.md](docs/COMPONENT_SECURITY_AUDIT.md) for full report

### Changed

- Updated README to reflect component security audit completion
- Components no longer marked as experimental

---

## [1.0.0] - 2024-11-XX

### 🎉 First Production Release

This is the first production-ready release of PAN. The **core messaging infrastructure** is stable, tested, and performance-validated.

#### ✅ Core Infrastructure (Production-Ready)

**Core Modules:**
- **pan-bus.mjs** - DOM-native event bus with pub/sub messaging
  - Exact and wildcard topic matching (`users.*`, `users.**`)
  - Retained message support for state management
  - Request/reply pattern with automatic cleanup
  - Shadow DOM traversal for component isolation
  - Automatic message ID and timestamp generation
  - Zero memory leaks validated

- **pan-client.mjs** - High-level client API
  - `publish()`, `subscribe()`, `request()`, `retained()` methods
  - AbortSignal support for subscription cleanup
  - Configurable host and bus element
  - Request timeout and cleanup handling

- **pan-autoload.mjs** - Automatic component discovery and loading

**API Stability:**
- All core APIs locked (no breaking changes in v1.x)
- Semantic versioning policy documented
- API stability guarantees in API_STABILITY.md

#### ✅ Testing & Quality (80%+ Coverage)

**Test Suites:**
- 85 comprehensive test suites covering all core functionality
- 80%+ code coverage of core modules (1,054 lines)
- Core functionality tests (pan-bus, pan-client, pan-autoload)
- Edge case and error handling tests
- Memory leak prevention tests
- Integration pattern tests (CRUD, state management, lifecycle)
- Performance benchmarks with Playwright + Chrome DevTools Protocol

**Test Infrastructure:**
- Playwright-based test runner
- Chrome DevTools Protocol integration for memory profiling
- HTTP server for realistic browser environment
- Performance measurement utilities

#### ✅ Performance Validation

**Benchmark Results:**
- Message Throughput: 300,300 msg/sec (30x threshold)
- Subscribe Speed: 434,783 ops/sec (434x threshold)
- Unsubscribe Speed: 114,943 ops/sec (114x threshold)
- Retained Retrieval: 9,814 msg/sec (19x threshold)
- Wildcard Performance: 291,545 msg/sec (58x threshold)
- Request/Reply Sequential: 103,093 req/sec
- Request/Reply Parallel: 109,890 req/sec
- Memory Leak: 0 MB increase over 30 seconds (266,800 messages)
- Large Datasets: <1ms (10k items, 2.93 MB)

**Performance Characteristics:**
- Sub-millisecond latency for all operations
- Linear scalability
- Zero memory leaks
- Efficient wildcard matching (only 3% overhead)

See docs/PERFORMANCE.md for detailed benchmarks.

#### ✅ Documentation

**Core Documentation:**
- API_REFERENCE.md - Complete API documentation with examples
- TOPICS.md - Topic naming conventions and patterns
- QUICK_START.md - Getting started guide
- PERFORMANCE.md - Performance characteristics and benchmarks
- API_STABILITY.md - Stability guarantees and versioning policy
- PAN_SPEC.v1.md - Complete technical specification
- V1_ROADMAP.md - Development roadmap
- V1_CHECKLIST.md - Release checklist
- RELEASE_NOTES.md - Detailed release notes
- Comprehensive JSDoc comments in all core files

#### 🔄 Browser Support

**Tested (v1.0):**
- ✅ Chrome (latest 2 versions)
- ✅ Edge (Chromium-based)

**Not Yet Tested (Planned for v1.1):**
- ⏳ Firefox, Safari, mobile browsers

**Note:** Core uses standard DOM APIs likely to work on all modern browsers.

#### 🔒 Security (Production-Ready)

**Completed:**
- ✅ Security best practices documentation
- ✅ Content Security Policy guidelines
- ✅ Input sanitization patterns
- ✅ localStorage security considerations
- ✅ **Comprehensive security audit of UI components** (Nov 2024)
  - pan-markdown-renderer: XSS protection verified
  - pan-files: Path traversal immune (OPFS sandboxing)
  - pan-form: Secure-by-design architecture
  - pan-php-connector: Defense-in-depth with backend
  - pan-graphql-connector: Variables-based queries
  - **Result:** 0 critical vulnerabilities found
  - Full report: [COMPONENT_SECURITY_AUDIT.md](docs/COMPONENT_SECURITY_AUDIT.md)

#### ✅ Components (Production-Ready)

**40+ UI components organized by layer:**
- Core: pan-layout, pan-header, pan-footer, pan-theme-provider, pan-icon
- Data: pan-data-table, pan-data-list, pan-data-grid, pan-chart
- Forms: pan-form, pan-field, pan-input, pan-select, pan-button, etc.
- Content: pan-markdown-renderer, pan-markdown-editor, pan-code-viewer, pan-files
- Feedback: pan-toast, pan-dialog, pan-tooltip, pan-progress
- Building Blocks: pan-card, pan-badge, pan-tabs, pan-accordion, pan-breadcrumbs, pan-pagination

**Security Status:**
- ✅ High-risk components audited and approved
- ✅ Defense-in-depth architecture verified
- ⚠️ Limited browser compatibility testing (Chrome-only, multi-browser testing planned for v1.1)

**Demo Applications:**
- Invoice Manager - CRUD operations with data table
- Markdown Notes - Markdown editor with file management
- Contact Manager - Contact list with search and filtering
- Building Blocks - Reusable UI component library

### Added

- **Component Autoload System** (`pan-autoload.mjs`): Automatic on-demand loading of components from the `components/` directory. No manual imports required—just use custom elements and they load automatically when approaching the viewport.
  - Configurable components path and root margin
  - Per-element module override with `data-module` attribute
  - Automatic registration of default exports

- **Router & Navigation**:
  - `<pan-router>`: URL routing with `nav.state` topic synchronization
    - History and hash mode support
    - Route guards with auth integration
    - Path parameters and query string parsing
    - Programmatic navigation via `nav.goto`, `nav.back`, `nav.forward` topics
  - `<pan-link>`: Declarative navigation links with automatic active class management
    - Exact matching support
    - Intercepts clicks for SPA navigation

- **WebSocket Bridge** (`<pan-websocket>`): Bidirectional WebSocket ↔ PAN communication
  - Automatic reconnection with exponential backoff
  - Heartbeat/ping support
  - Topic filtering for inbound and outbound messages
  - Connection status events (`ws.connected`, `ws.disconnected`, `ws.error`)

- **IndexedDB Bridge** (`<pan-idb>`): Client-side database operations via PAN topics
  - Full CRUD operations through topic-based API
  - Index support with queries
  - Multiple stores and databases
  - Automatic schema migration
  - Operations: `get`, `put`, `add`, `delete`, `clear`, `list`, `query`, `count`

- **Component Gallery** (`gallery.html`): Interactive component showcase
  - Live playground with code editor and preview
  - Search and category filtering
  - Direct links to component source code
  - Real-time examples for all components

- **New Examples**:
  - `15-router.html`: SPA routing with navigation and route parameters
  - `16-websocket.html`: Real-time chat demo with WebSocket bridge
  - `17-indexeddb.html`: Contact manager with IndexedDB persistence

- **Component Migration**: All components moved from `dist/` to `components/` with `.mjs` extension for better ES module support and consistency

### Changed

- All examples updated to use the new autoload system
- Modernized landing page (`index.html`) with hero section, features showcase, and improved documentation
- Updated README with comprehensive autoload documentation and installation instructions
- Migrated 24 component files to new `components/` directory structure

### Fixed

- `pan-form` retained subscription loop causing freeze on row click; subscribe once per selected id

### Previous Unreleased Items

- Added: Demo Browser SPA using `pan-demo-nav` and `pan-demo-viewer` over PAN `nav.*` topics
- Added: `pan-schema` and `pan-schema-form` for JSON Schema–driven UIs
- Added: `pan-php-connector` (api.php bridge) and `pan-graphql-connector` (GraphQL CRUD bridge)
- Added: Examples `09-schema-form.html`, `11-graphql-connector.html`, `12-php-connector.html`, and `pan-grid.html`

### 🎯 Breaking Changes (from 0.x)

None. This is the first stable release. All core APIs are now locked.

### 🐛 Known Issues

1. **Browser Support:** Limited to Chrome for v1.0 (multi-browser support in v1.1)
2. **Component Security:** UI components need security audit (experimental status)
3. **TypeScript:** No .d.ts definitions yet (planned for v1.1)
4. **Mobile:** Not yet tested on mobile browsers

### 📝 Migration from 0.x to 1.0

Core APIs remain compatible. No breaking changes for existing users of pan-bus and pan-client.

**What's stable now:**
- ✅ All core API signatures locked
- ✅ PanMessage envelope format locked
- ✅ Topic conventions locked
- ✅ CustomEvent names locked

**What's still experimental:**
- ⚠️ UI components (may have breaking changes)
- ⚠️ Component-specific APIs

---

## [0.1.0] - 2025-10-17

- Added: `<pan-sse>` bridge to translate Server-Sent Events into PAN topics.
  - Attributes: `src`, `topics`, `persist-last-event`, `backoff`, `with-credentials`.
- Added: Tiny reactive store utilities.
  - `pan-store`: `createStore()`, `bind()` for wiring forms ↔ state.
  - `pan-store-pan`: `syncItem()` and `syncList()` to connect stores to PAN topics (live updates, optional auto-save).
- Added: `<pan-table>` alias for `<pan-data-table>`.
- Added: Live per-item update pathway across components.
  - `pan-data-table`: listens to `${resource}.item.state.*` for granular updates.
  - `pan-form`: follows `${resource}.item.select` and live-syncs the selected item.
  - Data providers now publish per-item snapshots (retained) and deletions (non-retained).
- Added: Example “SSE + Store (Auto‑save)” at `examples/10-sse-store.html`.
- Added: Minimal Node sidecar for SSE + REST at `examples/server/sse-server.js`.
- Changed: Refreshed demo suite UI and navigation; added shared styles at `examples/assets/grail.css`.
- Docs: Expanded README with realtime bridges and store APIs.

---

Past history (pre-0.1.0) included the initial CRUD suite, examples, and foundational PAN bus/client helpers.
