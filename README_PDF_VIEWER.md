# PDF Viewer Phase F Implementation

## Overview
The PDF.js integration provides streaming document viewing with memory optimization, accessibility features, and layer toggling for translated content.

## Feature Flags

### Development Mode
```bash
# Enable PDF viewer in development
VITE_ENABLE_PDF_VIEWER=true npm run dev
```

### Production Mode
PDF viewer is disabled by default in production. To enable:
1. Ensure all security measures are in place
2. Host PDF.js worker properly
3. Set environment variable accordingly

## PDF.js Worker Configuration

### Development Setup
For development, the worker can be served locally:

```typescript
// In usePdfViewer.ts when pdfjs-dist is available
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
```

### Production Setup
For production, host the worker on your CDN:

```typescript
// Production worker configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://your-cdn.com/pdf.worker.mjs';
```

### Vite Asset Configuration
Add to `vite.config.ts`:

```typescript
export default defineConfig({
  // ... other config
  build: {
    rollupOptions: {
      external: ['pdfjs-dist/build/pdf.worker.js']
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
});
```

## Security Considerations

### Content Security Policy (CSP)
Update your CSP headers to allow PDF.js worker and WASM:

```
Content-Security-Policy: 
  script-src 'self' 'wasm-unsafe-eval';
  worker-src 'self' blob:;
  object-src 'none';
```

### File Access
- PDF files are accessed through Supabase storage with proper authentication
- All requests include Bearer tokens for secure access
- File URLs are temporary and expire according to Supabase settings

## Performance Characteristics

### Memory Management
- **Cache Size**: Maximum 5 rendered pages kept in memory
- **LRU Eviction**: Oldest pages removed when cache is full
- **Current Page**: Never cached (always fresh render)

### Rendering Performance
- **Target**: First page render < 2 seconds for 10-page, 3MB PDF
- **Target**: Page navigation < 500ms for subsequent pages
- **Optimization**: Uses devicePixelRatio for crisp rendering on HiDPI displays

### Metrics Collection
Debug metrics available in development:

```javascript
// Access in browser console
window.__metrics = window.__metrics || {};
// Metrics will be populated at window.__metrics.pdf
```

Metrics include:
- `firstPageRenderMs`: Time to render initial page
- `pageRenderMs`: Time for most recent page render
- `dpi`: Device pixel ratio
- `scale`: Current zoom level
- `cacheSize`: Number of cached pages
- `evictions`: Cache eviction count

## Error Handling

### User-Friendly Error Messages
Common error types are mapped to readable messages:

- **PasswordException** → "This PDF is password-protected."
- **InvalidPDFException** → "The file is corrupted or unsupported."
- **MissingPDFException** → "We couldn't download this file. Try again."

### Error Recovery
- Failed renders don't crash the viewer
- Users can retry loading documents
- Errors are logged with context for debugging

## Accessibility Features

### Screen Reader Support
- Canvas has `role="img"` and descriptive `aria-label`
- Page navigation announces current page number
- Keyboard navigation support for controls

### High Contrast
- UI controls use semantic color tokens
- Proper focus indicators on all interactive elements
- Scalable interface that respects user font size preferences

## API Reference

### usePdfViewer Hook

```typescript
const {
  state,          // Current viewer state
  metrics,        // Performance metrics
  canvasRef,      // Canvas element reference
  load,           // Load PDF from URL
  goToPage,       // Navigate to specific page
  setScale,       // Set zoom level (0.5-2.0)
  toggleLayer,    // Switch original/translated content
  dispose         // Cleanup resources
} = usePdfViewer();
```

### DocumentViewer Component

```tsx
<DocumentViewer
  documentUrl="https://..."
  documentId="doc-123"
  enableFeatures={{
    translation: true,    // Show original/translated toggle
    search: false,        // Search functionality (Phase F Week 2)
    download: true,       // Download button
    thumbnails: false     // Thumbnail sidebar (Phase F Week 2)
  }}
/>
```

## Troubleshooting

### Common Issues

**PDF.js worker not loading**
- Verify worker path is correct for your environment
- Check browser console for 404 errors
- Ensure CSP allows worker-src

**Memory issues with large PDFs**
- Check if cache size is appropriate for your use case
- Monitor memory usage in dev tools
- Consider reducing max cache size for mobile devices

**Slow rendering**
- Verify devicePixelRatio handling
- Check if scale is reasonable (avoid > 2.0 unless necessary)
- Monitor network for slow PDF downloads

### Development Debugging

Enable verbose logging:
```typescript
// In browser console
localStorage.setItem('pdfjs.verbosity', '5');
```

Check metrics:
```typescript
// View current metrics
console.log(window.__metrics?.pdf);
```

## Roadmap

### Phase F Week 2 (Next)
- Thumbnail generation with serialized queue
- Enhanced LRU caching strategy
- Search functionality across document content

### Phase F Week 3 (Future)
- Translation layer overlay with OCR positioning
- Text extraction and analysis
- Advanced accessibility features
