// Test script to manually trigger AI processing
const supabase = createClient(
  'https://gvfgvbztagafjykncwto.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Zmd2Ynp0YWdhZmp5a25jd3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODcwODE3MywiZXhwIjoyMDY0Mjg0MTczfQ.WjV2vKFKL7FACnIGOfXAj8Qi0bPEMDJO_Qpri_QAA_A'
);

// Trigger AI processing
const { data, error } = await supabase.functions.invoke('ai-content-processor', {
  body: {
    run_id: 'b4abb47a-428e-4ad1-ad76-1cc3eb4853d8',
    source: 'manual',
    quality_threshold: 0.3
  }
});

console.log('AI Processing Result:', { data, error });