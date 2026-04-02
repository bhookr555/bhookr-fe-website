import { CheckCircle } from "lucide-react";
import { PlanFeature } from "@/constants/pricing";

interface FeatureListProps {
  features: PlanFeature[];
}

export function FeatureList({ features }: FeatureListProps) {
  return (
    <ul className="mb-8 space-y-4">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start">
          {feature.included ? (
            <CheckCircle className="mr-3 h-5 w-5 text-[#E31E24] flex-shrink-0 mt-0.5" />
          ) : (
            <svg
              className="mr-3 h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
          <span className={`${feature.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
            {feature.text}
          </span>
        </li>
      ))}
    </ul>
  );
}
