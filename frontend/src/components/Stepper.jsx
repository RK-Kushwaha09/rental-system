import React from 'react';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { step: 1, label: 'PROPERTY', path: '/setup/property' },
  { step: 2, label: 'ROOMS', path: '/setup/rooms' },
  { step: 3, label: 'PRICING', path: '/setup/pricing' },
  { step: 4, label: 'REVIEW', path: '/setup/review' },
];

/**
 * Stepper component for RentManager Pro Onboarding
 * currentStep: 1 | 2 | 3 | 4
 */
export default function Stepper({ currentStep = 1, clickable = true }) {
  const navigate = useNavigate();

  const handleStepClick = (step) => {
    // Only allow clicking to prior steps or current step
    if (clickable && step.step <= currentStep) {
      navigate(step.path);
    }
  };

  return (
    <div className="stepper-container">
      {STEPS.map((item, index) => {
        const isCompleted = item.step < currentStep;
        const isActive = item.step === currentStep;
        const isUpcoming = item.step > currentStep;

        const circleClass = isCompleted
          ? 'step-circle completed'
          : isActive
          ? 'step-circle active'
          : 'step-circle upcoming';

        const labelClass = isCompleted
          ? 'step-label completed'
          : isActive
          ? 'step-label active'
          : 'step-label upcoming';

        const lineCompleted = item.step < currentStep;

        return (
          <React.Fragment key={item.step}>
            <div
              className="step-node"
              onClick={() => handleStepClick(item)}
              style={{ cursor: item.step <= currentStep ? 'pointer' : 'default' }}
            >
              <div className={circleClass}>
                {isCompleted ? <Check size={16} strokeWidth={3} /> : item.step}
              </div>
              <span className={labelClass}>{item.label}</span>
            </div>

            {index < STEPS.length - 1 && (
              <div
                className={`step-line ${lineCompleted ? 'completed' : ''}`}
                style={{
                  backgroundColor:
                    item.step < currentStep ? 'var(--color-interactive)' : '#E2E8F0',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
