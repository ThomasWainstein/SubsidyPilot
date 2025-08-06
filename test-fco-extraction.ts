// Test script to trigger FCO extraction with new verbatim processor
const testExtractionResponse = await fetch('https://gvfgvbztagafjykncwto.supabase.co/functions/v1/ai-content-processor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODcwODE3MywiZXhwIjoyMDY0Mjg0MTczfQ.w4v6J_4Zt5FqJ-yJfL6_7tQ_HFLyY6Ev4pR4YGrwAm8'
  },
  body: JSON.stringify({
    source: "franceagrimer",
    page_ids: ["1f0b1368-83ac-4a9e-99e2-138d535bae70"],
    quality_threshold: 0.5,
    session_id: "test-fco-verbatim"
  })
});

const result = await testExtractionResponse.json();
console.log('FCO Extraction Result:', result);