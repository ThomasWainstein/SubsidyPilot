# Excel File Upload Debugging Guide

## Issues Fixed

### 1. ❌ Security Validation Missing Excel Types
**Problem**: `src/utils/securityValidation.ts` was missing Excel MIME types
**Fix**: Added Excel support:
- `application/vnd.ms-excel` (.xls files)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx files)

### 2. ✅ Enhanced Error Logging
**Added comprehensive console logging throughout the validation chain:**
- File validation with detailed type/size info
- Security validation steps
- Document validation results
- Final validation before upload

## Current Excel Support Status

### ✅ Frontend Components
- **FileDropZone**: Accepts .xls and .xlsx
- **DocumentValidation**: Supports Excel MIME types  
- **FileValidation**: Supports Excel MIME types

### ✅ Backend/Edge Function
- **upload-farm-document**: Supports Excel MIME types
- **File content validation**: Validates Excel file signatures

### ✅ Storage & Database
- **Supabase bucket**: Public with proper RLS policies
- **Database**: farm_documents table ready for Excel files

## Testing Checklist

### 1. Upload Test Files
- [ ] Small .xlsx file (<1MB)
- [ ] Large .xlsx file (close to 50MB limit)  
- [ ] Small .xls file (<1MB)
- [ ] Corrupt Excel file (should show user-friendly error)

### 2. Check Console Logs
Look for these log messages:
```
🔍 File validation - Name: test.xlsx Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
✅ File validation passed!
🔄 Starting file validation for: test.xlsx
✅ Security validation passed for: test.xlsx
```

### 3. Network Requests
- Upload should POST to `/functions/v1/upload-farm-document`
- Response should be 200 with success message
- Document list should refresh automatically

### 4. Error Scenarios
- Wrong file type should show specific error: "File type X not supported. Please upload PDF, Word, Excel, or image files only."
- Large file should show: "File size must be less than 50MB."

## Manual Testing Instructions

1. **Go to farm Documents tab**
2. **Select Financial category** 
3. **Try uploading test.xlsx file**
4. **Check browser console for detailed logs**
5. **Verify file appears in document list**
6. **Try downloading/accessing the uploaded file**

## If Issues Persist

Check these additional locations:
- Browser file input `accept` attribute
- React Dropzone configuration
- Supabase storage bucket policies
- Edge function MIME type validation
- Database enum constraints

## Test Utility

Use `src/utils/excelFileTest.ts` to create test Excel files programmatically for debugging.