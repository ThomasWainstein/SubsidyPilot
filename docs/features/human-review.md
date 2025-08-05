# Human Review Interface – Documentation

## Overview

The Human Review Interface enables users to visually inspect, validate, and edit all data fields extracted from uploaded farm documents, aided by AI confidence scoring and validation feedback.

## How to Use

1. Navigate to the **Review Queue** from the main dashboard.
2. Select a document to open the review dialog.
3. Inspect each field using the color-coded confidence badges.
4. Edit values directly inline or accept/reject suggested values.
5. Save changes to update the farm profile.

## Features

### Confidence Scoring
- **Color-coded badges** per field and category showing extraction certainty
- **Three-tier confidence levels:** High (≥80%), Medium (50-80%), Low (<50%)
- **Visual indicators:** Green (high), Orange (medium), Red (low)
- **Tooltips** explaining confidence meanings and implications

### Progressive Disclosure
- **Accordion layout** with data grouped in logical categories:
  - Basic Farm Information (name, owner, address, contact)
  - Legal & Registration (status, tax numbers, permits)
  - Operational Details (land use, crops, livestock, irrigation)
  - Financial Information (revenue, employee count, insurance)
  - Certifications & Compliance (certificates, validity dates)
  - Location & Geography (coordinates, regions, environmental)
  - Emergency & Additional (contacts, special conditions, notes)

### Inline Editing
- **Type-specific editors:** text, number, date, boolean, array, email, URL, textarea
- **Real-time validation** with immediate feedback
- **Undo/redo functionality** for all changes
- **Visual change indicators** showing modified fields

### Bulk Operations
- **Filter by confidence level** (all, high, medium, low)
- **Bulk accept/reject** by confidence threshold or selection
- **Category-level operations** for efficient review
- **Smart suggestions** based on confidence patterns

### Accessibility
- **ARIA-labeled controls** for screen readers
- **Keyboard navigation** support throughout interface
- **Focus management** with proper visual indicators
- **High contrast mode** compatibility

## Review Workflow

1. **Upload Document:** User uploads a farm document for extraction
2. **Extraction Processing:** System extracts fields and calculates confidence scores
3. **Review Interface:** User opens "Review Extracted Data" dialog
4. **Field Inspection:** User reviews extracted fields organized by category
5. **Validation & Editing:** User accepts/rejects/modifies fields as needed
6. **Bulk Actions:** User applies bulk operations for efficiency
7. **Analytics Review:** User reviews summary statistics and completion status
8. **Save Results:** Validated data updates the farm profile

## Component Architecture

### Core Components

#### `FullExtractionReview`
- Main container component orchestrating the entire review interface
- Manages global state for all extracted fields and user actions
- Handles data persistence and API communication

#### `ConfidenceBadge`
- Displays confidence scores with color-coded visual indicators
- Provides contextual tooltips explaining confidence levels
- Supports different sizes (sm, md, lg) for various contexts

#### `ConfidenceSummary`
- Shows aggregated confidence statistics for field groups
- Displays high/medium/low confidence counts with badges
- Calculates and presents average confidence percentages

#### `CategoryAccordion`
- Implements progressive disclosure for field categories
- Handles expand/collapse states with smooth animations
- Shows category-level statistics and confidence summaries

#### `InlineFieldEditor`
- Provides type-specific editing controls for individual fields
- Handles real-time validation and change tracking
- Supports undo/redo operations with visual change indicators

#### `BulkActionBar`
- Enables bulk operations across multiple fields
- Provides filtering by confidence levels
- Implements batch accept/reject operations

#### `ReviewSummary`
- Displays comprehensive analytics and completion statistics
- Shows overall progress and review quality metrics
- Provides actionable insights for review completion

### Data Flow

```
Upload → Extraction → Review Interface → Field Editing → Validation → Persistence
                  ↓
              Confidence Scoring → Visual Indicators → User Decisions
```

## Extension Points

### Adding New Field Types
Extend the `InlineFieldEditor` component to support additional field types:

```tsx
// In InlineFieldEditor.tsx
case 'your-new-type':
  return <YourCustomInput />;
```

### Custom Validation Rules
Add field-specific validation in the `InlineFieldEditor`:

```tsx
const validateField = (value: any, type: string) => {
  switch (type) {
    case 'email':
      return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
    // Add your custom validation
  }
};
```

### New Categories
Extend the category configuration in `FullExtractionReview`:

```tsx
const categories = [
  // ... existing categories
  {
    title: 'Your New Category',
    description: 'Description of the category',
    icon: <YourIcon />,
    fields: relevantFields
  }
];
```

### Bulk Action Extensions
Add custom bulk operations in `BulkActionBar`:

```tsx
<Button onClick={() => onCustomBulkAction(selectedFields)}>
  Custom Action
</Button>
```

## Testing

### Unit Tests
- Component rendering with various props
- User interaction handling (click, keyboard)
- Field validation and state management
- Confidence score calculations and display

### Integration Tests
- Complete review workflow simulation
- Data persistence and recovery
- API communication and error handling
- Accessibility compliance verification

### Accessibility Tests
- Screen reader compatibility
- Keyboard navigation completeness
- Focus management verification
- ARIA attribute correctness

## Performance Considerations

### Optimization Strategies
- **Virtual scrolling** for large field lists (>100 fields)
- **React.memo** for field components to prevent unnecessary re-renders
- **Debounced search** and filter operations
- **Lazy loading** of field editing components

### Memory Management
- Automatic cleanup of local state on component unmount
- Efficient field change tracking with minimal object creation
- Optimized confidence calculation caching

## Best Practices

### User Experience
- Always provide clear feedback for user actions
- Use consistent visual language for confidence levels
- Implement progressive disclosure to reduce cognitive load
- Provide undo functionality for all destructive actions

### Development
- Follow TypeScript strict mode for type safety
- Implement comprehensive error boundaries
- Use semantic HTML elements for accessibility
- Maintain consistent naming conventions

### Accessibility
- Ensure all interactive elements are keyboard accessible
- Provide meaningful ARIA labels for screen readers
- Maintain sufficient color contrast ratios
- Test with actual assistive technologies

## Related Documentation

- [Document Classification](./document-classification.md) - Previous step in pipeline
- [Local Extraction](./local-extraction.md) - Extraction process details
- [API Documentation](./api-documentation.md) - Backend integration
- [Development Testing Guide](../development/testing.md) - Testing procedures

## Support

For questions or issues with the Human Review Interface:
1. Check the troubleshooting section in this documentation
2. Review the component test files for usage examples
3. Consult the API documentation for backend integration details
4. Contact the development team for technical support
