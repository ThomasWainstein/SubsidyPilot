// Shared harvester utilities for Group 2 (C+D)
export type FetchStat = {
  url: string; 
  status: number; 
  bytes: number; 
  t_ms: number; 
  ok: boolean; 
  err?: string;
};

export async function fetchHTML(url: string): Promise<{ html: string; stat: FetchStat }> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8,ro-RO,ro;q=0.7',
        'Cache-Control': 'no-cache'
      }
    });
    const html = await res.text();
    return { 
      html, 
      stat: { 
        url, 
        status: res.status, 
        bytes: html.length, 
        t_ms: Date.now()-t0, 
        ok: res.ok 
      } 
    };
  } catch (e: any) {
    return { 
      html: '', 
      stat: { 
        url, 
        status: 0, 
        bytes: 0, 
        t_ms: Date.now()-t0, 
        ok: false, 
        err: e?.message || 'fetch_error' 
      } 
    };
  }
}

export function stripToText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalize(base: string, href: string) {
  try { 
    return new URL(href, base).toString().replace(/#.*$/, ''); 
  } catch { 
    return null; 
  }
}

export function looksLikeSubsidyUrl(u: string, locale: 'fr'|'ro') {
  const fr = /(\/aides?\/|subvention|appel(-|\s)?(à|a)\s?projets|éligibilit|dispositif|mesure|aide-)/i;
  const ro = /(sprijin|m[ăa]sur[ăa]|apel|grant|eligibilitate|ghidul|subm[ăa]sur[ăa]|pnrr|pndr)/i;
  return locale === 'fr' ? fr.test(u) : ro.test(u);
}

export function looksLikeAdminUrl(u: string, locale: 'fr'|'ro') {
  const fr = /(transparence|organigramme|contact|mentions|march[eé]s|procurement|accessibilit[eé])/i;
  const ro = /(informatii(-|\s)de(-|\s)interes(-|\s)public|achizit|transparent[ăa]|organigram[ăa]|contact)/i;
  return locale === 'fr' ? fr.test(u) : ro.test(u);
}

// Logging helper compatible with Group 1
export const logEvent = (scope: string, run_id?: string, extra: Record<string, any> = {}) => {
  const payload = {
    ts: new Date().toISOString(),
    scope,
    run_id: run_id || null,
    ...extra,
  };
  console.log(JSON.stringify(payload));
};