
import { Subsidy } from '@/types/subsidy';

interface AttachedSubsidy {
  farmId: string;
  subsidyId: string;
  status: "Draft" | "In Progress" | "Submitted" | "Approved";
  lastUpdated: string;
  source: "search" | "static";
}

// Key for storing attached subsidies in localStorage
const ATTACHED_SUBSIDIES_KEY = 'attached_subsidies';

// Get all attached subsidies
export const getAttachedSubsidies = (): AttachedSubsidy[] => {
  try {
    const stored = localStorage.getItem(ATTACHED_SUBSIDIES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error retrieving attached subsidies:", error);
    return [];
  }
};

// Add a new attached subsidy
export const attachSubsidyToFarm = (subsidyId: string, farmId: string, source: "search" | "static" = "search"): void => {
  try {
    const attachedSubsidies = getAttachedSubsidies();
    
    // Check if this subsidy is already attached to this farm
    const alreadyAttached = attachedSubsidies.some(
      attachment => attachment.subsidyId === subsidyId && attachment.farmId === farmId
    );
    
    if (!alreadyAttached) {
      const newAttachment: AttachedSubsidy = {
        farmId,
        subsidyId,
        status: "Draft",
        lastUpdated: new Date().toISOString(),
        source
      };
      
      attachedSubsidies.push(newAttachment);
      localStorage.setItem(ATTACHED_SUBSIDIES_KEY, JSON.stringify(attachedSubsidies));
    }
  } catch (error) {
    console.error("Error attaching subsidy to farm:", error);
  }
};

// Check if a subsidy is attached to any farm
export const isSubsidyAttached = (subsidyId: string): boolean => {
  const attachedSubsidies = getAttachedSubsidies();
  return attachedSubsidies.some(attachment => attachment.subsidyId === subsidyId);
};

// Check if a subsidy is attached to a specific farm
export const isSubsidyAttachedToFarm = (subsidyId: string, farmId: string): boolean => {
  const attachedSubsidies = getAttachedSubsidies();
  return attachedSubsidies.some(
    attachment => attachment.subsidyId === subsidyId && attachment.farmId === farmId
  );
};

// Get all farms that a subsidy is attached to
export const getFarmsWithSubsidy = (subsidyId: string): string[] => {
  const attachedSubsidies = getAttachedSubsidies();
  return attachedSubsidies
    .filter(attachment => attachment.subsidyId === subsidyId)
    .map(attachment => attachment.farmId);
};

// Get all subsidies attached to a farm
export const getSubsidiesForFarm = (farmId: string): string[] => {
  const attachedSubsidies = getAttachedSubsidies();
  return attachedSubsidies
    .filter(attachment => attachment.farmId === farmId)
    .map(attachment => attachment.subsidyId);
};

// Update the subsidy data with attachment information
export const updateSubsidiesWithAttachmentInfo = (subsidies: Subsidy[]): Subsidy[] => {
  return subsidies.map(subsidy => {
    const attachedFarms = getFarmsWithSubsidy(subsidy.id);
    return {
      ...subsidy,
      isAttached: attachedFarms.length > 0,
      attachedFarms
    };
  });
};
