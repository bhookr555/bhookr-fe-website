"use client";

import { Check } from "lucide-react";

interface Step {
  number: number;
  title: string;
}

interface CheckoutStepperProps {
  currentStep: number;
  steps: Step[];
}

export function CheckoutStepper({ currentStep, steps }: CheckoutStepperProps) {
  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between max-w-3xl mx-auto px-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center relative">
              <div
                className={`
                  w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-bold text-base sm:text-lg
                  transition-all duration-300 z-10 shadow-lg
                  ${
                    currentStep > step.number
                      ? "bg-green-600 text-white ring-4 ring-green-100 dark:ring-green-900/30"
                      : currentStep === step.number
                      ? "bg-gradient-to-br from-red-600 to-orange-600 text-white ring-4 ring-red-100 dark:ring-red-900/30 scale-110"
                      : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }
                `}
              >
                {currentStep > step.number ? (
                  <Check className="w-6 h-6 sm:w-7 sm:h-7" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`
                  mt-3 text-xs sm:text-sm font-medium text-center whitespace-nowrap
                  ${
                    currentStep >= step.number
                      ? "text-gray-900 dark:text-white font-semibold"
                      : "text-gray-500 dark:text-gray-400"
                  }
                `}
              >
                {step.title}
              </span>
            </div>

            {/* Line */}
            {index < steps.length - 1 && (
              <div
                className={`
                  h-1.5 flex-1 mx-2 sm:mx-4 rounded-full transition-all duration-500
                  ${
                    currentStep > step.number
                      ? "bg-gradient-to-r from-green-600 to-green-500"
                      : currentStep === step.number
                      ? "bg-gradient-to-r from-red-600 to-gray-200 dark:to-gray-700"
                      : "bg-gray-200 dark:bg-gray-700"
                  }
                `}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
