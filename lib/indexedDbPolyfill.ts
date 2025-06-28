// Polyfill for indexedDB so that libraries such as WalletConnect that
// expect the IndexedDB API do not throw when code is executed in a Node.js
// environment (e.g. during `next build`).
//
// This file is imported on the server (see app/layout.tsx) and ensures that
// `globalThis.indexedDB` & friends exist before any third-party modules are
// evaluated.

if (typeof globalThis.indexedDB === 'undefined') {
  /* Using `require` keeps the polyfill out of client bundles */
  // eslint-disable-next-line
  const { indexedDB, IDBKeyRange } = require('fake-indexeddb');

  // Attach to the global scope
  // @ts-ignore – Node typings don't include indexedDB
  globalThis.indexedDB = indexedDB;
  // @ts-ignore – Node typings don't include IDBKeyRange
  globalThis.IDBKeyRange = IDBKeyRange;
} 