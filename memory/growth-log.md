# ECC Growth & Learning Log

## Session Date: 2026-09-13

### Architectural Learnings & Corrections
- **Firebase Sub-collection Migration**: When moving from a single monolithic 1MB document to sub-collections, a delta-sync strategy is required. However, naive implementation via `Promise.all(promises)` creates a catastrophic DDoS vector against Firestore.
- **Firestore Batch Limits**: Concurrent limits and quota caps necessitate chunking operations into `writeBatch()` objects (max 500 operations per batch).
- **Synchronous Cache Poisoning**: In delta-sync operations, local cache hashes must *never* be updated synchronously before the network request resolves. If the network fails, the cache falsely registers success, leading to silent, unrecoverable data loss. Cache hashes must only update *after* `batch.commit()` succeeds.
- **LocalStorage Quota Limits**: Relying on `localStorage` for primary offline persistence of large arrays (like historic invoices) is dangerous. At ~5MB, it throws a `QuotaExceededError`. All `localStorage.setItem` calls for large data blobs must be wrapped in `try...catch` blocks to prevent catastrophic app crashes.
