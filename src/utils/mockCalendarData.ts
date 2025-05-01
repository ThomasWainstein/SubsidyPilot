
import { addDays, addMonths, format, subDays } from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import { v4 as uuidv4 } from 'uuid';
import { farms } from '@/data/farms';

const eventTypes = ['funding', 'compliance', 'document', 'task', 'regulatory'] as const;
const subsidyPrograms = ['EAFRD', 'Bpifrance', 'Horizon', 'CAP', 'EARDF', 'PEI-AGRI'];
const regulationTypes = ['DNSH', 'Nitrate Zone', 'Water Framework', 'Eco-Scheme', 'Carbon Reporting', 'Sustainability'];

// Function to generate a random event
const generateRandomEvent = (farmId: string): CalendarEvent => {
  const farm = farms.find(f => f.id === farmId);
  const farmName = farm?.name || 'Unknown Farm';
  
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  const start = new Date();
  start.setDate(start.getDate() - Math.floor(Math.random() * 15)); // Past 15 days
  start.setDate(start.getDate() + Math.floor(Math.random() * 45)); // Future 45 days
  
  // End date is same day for tasks, or 1-3 days later for other events
  const end = addDays(start, eventType === 'task' ? 0 : Math.floor(Math.random() * 3) + 1);
  
  return {
    id: uuidv4(),
    title: getEventTitle(eventType),
    start,
    end,
    farmId,
    farmName,
    eventType,
    subsidyProgram: getRandomItem(subsidyPrograms),
    regulationType: eventType === 'compliance' || eventType === 'regulatory' ? 
      getRandomItem(regulationTypes) : undefined,
    description: getEventDescription(eventType),
  };
};

function getEventTitle(eventType: string): string {
  const titles: Record<string, string[]> = {
    funding: ['Submit EAFRD Application', 'Bpifrance Grant Deadline', 'Innovation Funding Opportunity', 'Sustainability Grant Application', 'Regional Development Fund Deadline'],
    compliance: ['Environmental Compliance Audit', 'Water Usage Report Due', 'Nitrate Zone Compliance Check', 'Annual Regulatory Review', 'Carbon Footprint Submission'],
    document: ['Upload CAP Documentation', 'Renew Farm Certification', 'Submit Production Records', 'Land Usage Documentation', 'Equipment Verification Forms'],
    task: ['Meet with Regional Advisor', 'Complete Soil Analysis', 'Review Sustainability Plan', 'Update Farm Management Software', 'Equipment Maintenance Schedule'],
    regulatory: ['DNSH Assessment Due', 'Climate Adaptation Report', 'Annual Environmental Review', 'EU Agricultural Directive Deadline', 'Local Compliance Submission']
  };
  
  const options = titles[eventType] || ['General Farm Task'];
  return options[Math.floor(Math.random() * options.length)];
}

function getEventDescription(eventType: string): string {
  const descriptions: Record<string, string[]> = {
    funding: ['Submit all required documentation for funding approval. Ensure financial statements are up to date.', 'Complete the grant application process before the deadline. Include all project details and budget estimates.', 'Opportunity for innovation funding. Prepare project outline and expected outcomes.'],
    compliance: ['Ensure all environmental standards are met for the annual compliance audit.', 'Complete and submit water usage reports for regulatory compliance.', 'Verify all nitrate zone requirements are being followed and documented.'],
    document: ['Upload all required CAP documentation through the portal. Verification will follow.', 'Complete the recertification process for organic/sustainable farming practices.', 'Submit detailed production records for the previous growing season.'],
    task: ['Schedule and prepare for meeting with the regional agricultural advisor.', 'Complete comprehensive soil analysis for all major growing areas.', 'Annual review and update of the farm sustainability plan.'],
    regulatory: ['Complete and submit DNSH (Do No Significant Harm) assessment.', 'Prepare and submit the climate adaptation plan for regulatory approval.', 'Complete annual environmental impact review and documentation.']
  };
  
  const options = descriptions[eventType] || ['Complete this task by the deadline.'];
  return options[Math.floor(Math.random() * options.length)];
}

function getRandomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Generate a set of events for each farm
export function generateMockEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  
  // For each farm, generate 5-10 events
  farms.forEach(farm => {
    const numEvents = Math.floor(Math.random() * 6) + 5; // 5-10 events per farm
    for (let i = 0; i < numEvents; i++) {
      events.push(generateRandomEvent(farm.id));
    }
  });
  
  return events;
}

// Generate some upcoming deadlines for a specific farm
export function generateFarmEvents(farmId: string, count: number = 5): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (let i = 0; i < count; i++) {
    events.push(generateRandomEvent(farmId));
  }
  return events;
}
