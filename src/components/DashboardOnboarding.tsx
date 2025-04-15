import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
const DashboardOnboarding = () => {
  const {
    t
  } = useLanguage();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  useEffect(() => {
    // Check if the user has seen the onboarding before
    const hasSeenBefore = localStorage.getItem('hasSeenDashboardOnboarding');
    if (!hasSeenBefore && !hasSeenOnboarding) {
      setOpen(true);
      setHasSeenOnboarding(true);
      localStorage.setItem('hasSeenDashboardOnboarding', 'true');
    }
  }, [hasSeenOnboarding]);
  const steps = [{
    title: "Welcome to Your Client Farm Dashboard",
    description: t('dashboard.onboarding.farmCards')
  }, {
    title: "Farm Status Alerts",
    description: t('dashboard.onboarding.badges')
  }, {
    title: "Performance Overview",
    description: t('dashboard.onboarding.metrics')
  }];
  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      setOpen(false);
    }
  };
  return <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="fixed bottom-4 right-4 rounded-full z-50 bg-primary text-primary-foreground my-[30px]">
        ?
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{steps[step - 1].title}</DialogTitle>
            <DialogDescription>{steps[step - 1].description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-center mt-4">
            <div className="flex space-x-2">
              {steps.map((_, index) => <div key={index} className={`w-2 h-2 rounded-full ${index + 1 === step ? 'bg-primary' : 'bg-gray-300'}`} />)}
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleNext}>
              {step === steps.length ? t('dashboard.onboarding.start') : t('common.continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>;
};
export default DashboardOnboarding;