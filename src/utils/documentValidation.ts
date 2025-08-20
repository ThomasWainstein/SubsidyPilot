/**
 * Document validation and health checking utilities
 */

export interface DocumentHealthCheck {
  url: string;
  isAccessible: boolean;
  responseTime: number;
  status: number | null;
  lastChecked: Date;
  error?: string;
}

export async function validateDocumentUrl(url: string): Promise<DocumentHealthCheck> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors'
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      url,
      isAccessible: response.status >= 200 && response.status < 400,
      responseTime,
      status: response.status,
      lastChecked: new Date()
    };
  } catch (error) {
    return {
      url,
      isAccessible: false,
      responseTime: Date.now() - startTime,
      status: null,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}