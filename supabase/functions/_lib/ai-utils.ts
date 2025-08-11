// Shared AI utilities for Group 3: AI Processing Instrumentation + Structured Insert Path

export function robustJsonArray(text: string): any[] {
  if (!text) return [];
  
  // try raw parsing first
  try { 
    const j = JSON.parse(text); 
    return Array.isArray(j) ? j : [j]; 
  } catch {}
  
  // try code fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { 
      const j = JSON.parse(fenced[1]); 
      return Array.isArray(j) ? j : [j]; 
    } catch {}
  }
  
  // last resort: bracket slice
  const start = text.indexOf('['), end = text.lastIndexOf(']');
  if (start >= 0 && end > start) {
    try { 
      return JSON.parse(text.slice(start, end+1)); 
    } catch {}
  }
  
  return [];
}

export function coerceSubsidy(obj: any) {
  const norm = (s?: any) => (typeof s === 'string' ? s.trim() : null);
  const toDate = (s?: any) => {
    if (!s || typeof s !== 'string') return null;
    const m = s.match(/\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : null;
  };
  
  return {
    title: norm(obj?.title),
    description: norm(obj?.description),
    eligibility: norm(obj?.eligibility),
    deadline: toDate(obj?.deadline),
    funding_type: norm(obj?.funding_type),
    agency: norm(obj?.agency),
    sector: norm(obj?.sector),
    region: norm(obj?.region)
  };
}

export function makeFingerprint(s: {
  title?: string|null,
  agency?: string|null,
  deadline?: string|null,
  url?: string|null
}) {
  const basis = [
    (s.title||'').toLowerCase().replace(/\s+/g, ' ').trim(),
    (s.agency||'').toLowerCase().replace(/\s+/g, ' ').trim(),
    (s.deadline||'').toLowerCase(),
    // url helps reduce cross-site collisions; keep but don't rely on url-only
    (s.url||'').toLowerCase()
  ].join('|');
  
  // lightweight hash (avoid crypto import differences)
  let h = 0; 
  for (let i = 0; i < basis.length; i++) { 
    h = ((h << 5) - h) + basis.charCodeAt(i); 
    h |= 0; // Convert to 32bit integer
  }
  return `s_${Math.abs(h)}`;
}

export function chunkText(text: string, maxSize: number = 8000): string[] {
  if (text.length <= maxSize) return [text];
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = Math.min(start + maxSize, text.length);
    
    // Try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const lastSentence = text.lastIndexOf('.', end);
      const lastParagraph = text.lastIndexOf('\n\n', end);
      const breakPoint = Math.max(lastSentence, lastParagraph);
      
      if (breakPoint > start + maxSize * 0.5) {
        end = breakPoint + 1;
      }
    }
    
    chunks.push(text.slice(start, end));
    start = end;
  }
  
  return chunks;
}
