
/**
 * Utility function to scroll to a specific subsidy element by ID
 * @param subsidyId The ID of the subsidy to scroll to
 */
export const scrollToSubsidy = (subsidyId: string): void => {
  // Wait for the DOM to update and the element to be available
  setTimeout(() => {
    const element = document.getElementById(`subsidy-${subsidyId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add a temporary highlight to the element
      element.classList.add('highlight-subsidy');
      
      // Remove the highlight class after animation completes
      setTimeout(() => {
        element.classList.remove('highlight-subsidy');
      }, 3000);
    }
  }, 300);
};
