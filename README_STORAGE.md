# Storage Provider System

A flexible, provider-agnostic storage abstraction layer for the Legacy Doc Generator.

## Quick Start

### Run Tests
```bash
npm run test:storage
```

### Use in Code
```typescript
import { getStorageProvider } from '@/services/storage';

const storage = getStorageProvider();

// Upload file with new path format
const key = `documentations/${userId}/${projectId}/${docId}/README.md`;
const buffer = Buffer.from('# Documentation');

const result = await storage.upload(buffer, key, {
  contentType: 'text/markdown',
  metadata: { author: 'system' }
});

// Get signed URL
const url = await storage.getSignedUrl(key);

// Download
const file = await storage.download(key);
```

## Path Format

**Format**: `documentations/{userId}/{projectId}/{documentationId}/{fileName}`

**Example**: `documentations/user-123/project-456/doc-789/README.md`

## Supported Providers

- ✅ **Local Storage** - File system (default)
- ✅ **Oracle Cloud** - Object Storage
- 🔜 **AWS S3** - Coming soon
- 🔜 **Azure Blob** - Coming soon
- 🔜 **GCP** - Coming soon

## Switching Providers

Update `.env`:
```bash
# Local (default)
STORAGE_PROVIDER=local

# Oracle Cloud
STORAGE_PROVIDER=oracle_cloud
OCI_NAMESPACE=your_namespace
OCI_BUCKET_NAME=your_bucket
# ... other OCI vars
```

Restart server - that's it!

## Testing

The test suite validates:
- Provider initialization
- File operations (upload, download, delete)
- Metadata management
- URL generation
- Path format compliance
- Error handling

Run: `npm run test:storage`

## Documentation

- `PHASE1_COMPLETION_SUMMARY.md` - Infrastructure setup
- `PHASE2_COMPLETION_SUMMARY.md` - Implementation details
- `PHASE2_TEST_RESULTS.md` - Test results and metrics
- `ORACLE_CLOUD_SETUP.md` - Oracle Cloud configuration
