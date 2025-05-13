import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

// Types
interface StepperProps {
  index: number;
  count: number;
  orientation?: "horizontal" | "vertical";
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

interface StepContextProps {
  isActive?: boolean;
  isCompleted?: boolean;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  size?: "sm" | "md" | "lg";
}

// Create context
const StepperContext = createContext<StepperProps>({
  index: 0,
  count: 0,
});

const StepContext = createContext<StepContextProps>({
  isActive: false,
  isCompleted: false,
  isFirstStep: false,
  isLastStep: false,
  size: "md",
});

// Hook for managing steps
export function useSteps({ count, index = 0 }: { count: number; index?: number }) {
  const [activeStep, setActiveStep] = useState(index);

  const nextStep = () => {
    setActiveStep((prev) => (prev < count - 1 ? prev + 1 : prev));
  };

  const prevStep = () => {
    setActiveStep((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const reset = () => {
    setActiveStep(0);
  };

  const setStep = (step: number) => {
    const next = step < count ? step : count - 1;
    setActiveStep(next > 0 ? next : 0);
  };

  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === count - 1;

  return {
    activeStep,
    setActiveStep: setStep,
    nextStep,
    prevStep,
    reset,
    isFirstStep,
    isLastStep,
  };
}

// Stepper component
export function Stepper({
  children,
  index,
  count,
  orientation = "horizontal",
  size = "md",
  className,
  ...props
}: StepperProps & React.HTMLAttributes<HTMLDivElement>) {
  const isVertical = orientation === "vertical";
  
  const contextValue = {
    index,
    count,
  };

  return (
    <StepperContext.Provider value={contextValue}>
      <div
        className={cn(
          "flex gap-4",
          isVertical ? "flex-col" : "flex-row",
          className
        )}
        {...props}
      >
        {children && Array.isArray(children)
          ? children.map((child, i) => {
              if (!child) return null;
              
              // Skip rendering if more children than count
              if (i >= count) return null;

              const isActive = index === i;
              const isCompleted = index > i;
              const isFirstStep = i === 0;
              const isLastStep = i === count - 1;

              return (
                <StepContext.Provider
                  key={i}
                  value={{ isActive, isCompleted, isFirstStep, isLastStep, size }}
                >
                  {child}
                </StepContext.Provider>
              );
            })
          : null}
      </div>
    </StepperContext.Provider>
  );
}

// Step component
export function Step({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isActive, isCompleted } = useStepContext();
  
  return (
    <div
      className={cn(
        "flex items-start gap-2",
        isActive && "text-foreground",
        !isActive && !isCompleted && "text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Step indicator
export function StepIndicator({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isActive, isCompleted, size } = useStepContext();

  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 bg-background",
        isActive && "border-primary text-primary",
        isCompleted && "border-primary bg-primary text-primary-foreground",
        !isActive && !isCompleted && "border-muted-foreground text-muted-foreground",
        sizes[size || "md"],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Step separator
export function StepSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isFirstStep, isLastStep, isCompleted } = useStepContext();
  const { count } = useStepperContext();

  if (isLastStep) return null;

  return (
    <div
      className={cn(
        "flex-1 h-0.5 ml-2 mt-4",
        isCompleted ? "bg-primary" : "bg-muted-foreground/25",
        className
      )}
      {...props}
    />
  );
}

// Step number
export function StepNumber({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { isCompleted } = useStepContext();
  const { index } = useStepperContext();

  // Get current step number in context
  const steps = Array.isArray(useContext(StepperContext.Provider)?.props?.value?.children)
    ? useContext(StepperContext.Provider)?.props?.value?.children
    : [];
  
  const currentStepIndex = steps.findIndex(
    (step) => step?.props?.value?.isActive
  );
  
  return (
    <div className={cn("text-sm font-medium", className)} {...props}>
      {isCompleted ? <CheckIcon className="h-4 w-4" /> : index + 1}
    </div>
  );
}

// Step title
export function StepTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

// Step description
export function StepDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

// Step status for handling states
export function StepStatus({
  complete,
  incomplete,
  active,
}: {
  complete: React.ReactNode;
  incomplete: React.ReactNode;
  active: React.ReactNode;
}) {
  const { isActive, isCompleted } = useStepContext();

  if (isCompleted) {
    return complete;
  }

  if (isActive) {
    return active;
  }

  return incomplete;
}

// Hooks for accessing context
const useStepContext = () => useContext(StepContext);
const useStepperContext = () => useContext(StepperContext);