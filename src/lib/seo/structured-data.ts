/**
 * SEO structured data (JSON-LD) generation for subsidies
 */

interface GovernmentService {
  '@context': string;
  '@type': string;
  name: string;
  description?: string;
  provider: Organization;
  areaServed?: Place;
  audience?: Audience;
  availableChannel?: ServiceChannel;
  hoursAvailable?: OpeningHoursSpecification;
  offers?: Offer;
  termsOfService?: string;
  serviceOutput?: string;
  category?: string;
}

interface Organization {
  '@type': string;
  name: string;
  url?: string;
  contactPoint?: ContactPoint;
}

interface Place {
  '@type': string;
  name: string;
  addressCountry?: string;
  addressRegion?: string;
}

interface Audience {
  '@type': string;
  audienceType: string;
}

interface ServiceChannel {
  '@type': string;
  serviceUrl?: string;
  servicePhone?: string;
  availableLanguage?: string[];
}

interface OpeningHoursSpecification {
  '@type': string;
  dayOfWeek: string[];
  opens?: string;
  closes?: string;
}

interface Offer {
  '@type': string;
  price?: string;
  priceCurrency?: string;
  description?: string;
  eligibleRegion?: Place;
  validFrom?: string;
  validThrough?: string;
}

interface ContactPoint {
  '@type': string;
  telephone?: string;
  email?: string;
  contactType: string;
  availableLanguage?: string[];
}

interface BreadcrumbList {
  '@context': string;
  '@type': string;
  itemListElement: ListItem[];
}

interface ListItem {
  '@type': string;
  position: number;
  name: string;
  item: string;
}

/**
 * Generate structured data for a subsidy
 */
export function generateSubsidyStructuredData(subsidy: any): GovernmentService {
  const baseUrl = window.location.origin;
  
  // Extract region information
  const region = subsidy.geographic_scope || subsidy.region;
  const agency = subsidy.agency || subsidy.issuing_body || 'Government Agency';
  
  // Extract funding information
  const amount = subsidy.amount || subsidy.funding_amount;
  const deadline = subsidy.deadline || subsidy.application_deadline;
  
  // Parse les-aides.fr specific data if available
  const lesAidesData = subsidy.raw_data?.fiche || null;
  const organisme = lesAidesData?.organisme || null;

  const structuredData: GovernmentService = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: subsidy.title || 'Agricultural Subsidy Program',
    description: subsidy.description || 'Government financial support for agricultural activities',
    provider: {
      '@type': 'GovernmentOrganization',
      name: organisme?.raison_sociale || agency,
      url: organisme?.site_web || subsidy.source_url,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['French', 'English']
      }
    },
    category: 'Agricultural Support',
    serviceOutput: 'Financial Grant'
  };

  // Add area served if region is available
  if (region) {
    structuredData.areaServed = {
      '@type': 'AdministrativeArea',
      name: region,
      addressCountry: 'FR' // TODO: Make this dynamic based on country
    };
  }

  // Add audience information
  structuredData.audience = {
    '@type': 'BusinessAudience',
    audienceType: 'Farmers and Agricultural Businesses'
  };

  // Add service channel
  if (subsidy.source_url) {
    structuredData.availableChannel = {
      '@type': 'ServiceChannel',
      serviceUrl: subsidy.source_url,
      availableLanguage: ['fr', 'en']
    };
  }

  // Add offer information if funding details are available
  if (amount) {
    structuredData.offers = {
      '@type': 'Offer',
      description: `Financial support: ${amount}`,
      priceCurrency: 'EUR',
      eligibleRegion: structuredData.areaServed,
      validThrough: deadline || undefined
    };
  }

  return structuredData;
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbStructuredData(subsidyTitle?: string): BreadcrumbList {
  const baseUrl = window.location.origin;
  
  const breadcrumbs: BreadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Search Subsidies',
        item: `${baseUrl}/search`
      }
    ]
  };

  if (subsidyTitle) {
    breadcrumbs.itemListElement.push({
      '@type': 'ListItem',
      position: 3,
      name: subsidyTitle,
      item: window.location.href
    });
  }

  return breadcrumbs;
}

/**
 * Generate FAQ structured data if available
 */
export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * Inject structured data into document head
 */
export function injectStructuredData(data: any): void {
  // Remove existing structured data
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
  existingScripts.forEach(script => {
    if (script.textContent?.includes('"@context"')) {
      script.remove();
    }
  });

  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Generate and inject all structured data for a subsidy page
 */
export function setupSubsidyPageSEO(subsidy: any): void {
  const subsidyData = generateSubsidyStructuredData(subsidy);
  const breadcrumbData = generateBreadcrumbStructuredData(subsidy.title);
  
  // Inject structured data
  injectStructuredData([subsidyData, breadcrumbData]);
  
  // Update meta tags
  updateMetaTags(subsidy);
}

/**
 * Update meta tags for SEO
 */
function updateMetaTags(subsidy: any): void {
  const region = subsidy.geographic_scope || subsidy.region || 'France';
  const amount = subsidy.amount || subsidy.funding_amount || 'Variable';
  
  // Update title
  document.title = `${subsidy.title} - Agricultural Subsidy | AgriTool`;
  
  // Update meta description
  updateMetaTag('description', 
    `Learn about ${subsidy.title}, a ${region} agricultural subsidy program. Maximum funding: ${amount}. Apply now for agricultural support.`
  );
  
  // Update Open Graph tags
  updateMetaTag('og:title', `${subsidy.title} - Agricultural Subsidy`);
  updateMetaTag('og:description', subsidy.description || `Financial support for agricultural activities in ${region}`);
  updateMetaTag('og:url', window.location.href);
  updateMetaTag('og:type', 'article');
  
  // Update Twitter Card tags
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', `${subsidy.title} - Agricultural Subsidy`);
  updateMetaTag('twitter:description', subsidy.description || `Financial support for agricultural activities in ${region}`);
  
  // Update canonical URL
  updateLinkTag('canonical', window.location.href);
}

/**
 * Update or create meta tag
 */
function updateMetaTag(name: string, content: string): void {
  const selector = name.startsWith('og:') || name.startsWith('twitter:') 
    ? `meta[property="${name}"]` 
    : `meta[name="${name}"]`;
    
  let meta = document.querySelector(selector) as HTMLMetaElement;
  
  if (!meta) {
    meta = document.createElement('meta');
    if (name.startsWith('og:') || name.startsWith('twitter:')) {
      meta.setAttribute('property', name);
    } else {
      meta.setAttribute('name', name);
    }
    document.head.appendChild(meta);
  }
  
  meta.content = content;
}

/**
 * Update or create link tag
 */
function updateLinkTag(rel: string, href: string): void {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  
  link.href = href;
}