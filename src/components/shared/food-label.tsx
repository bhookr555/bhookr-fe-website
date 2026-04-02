import React from "react";

export type FoodType = "veg" | "non-veg" | "egg" | "vegan";

interface FoodLabelProps {
  type: FoodType;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const foodConfig = {
  veg: {
    borderColor: "border-green-600",
    dotColor: "bg-green-600",
    label: "VEG",
  },
  "non-veg": {
    borderColor: "border-red-600",
    dotColor: "bg-red-600",
    label: "NON-VEG",
  },
  egg: {
    borderColor: "border-amber-500",
    dotColor: "bg-amber-500",
    label: "EGG",
  },
  vegan: {
    borderColor: "border-lime-600",
    dotColor: "bg-lime-600",
    label: "VEGAN",
  },
};

const sizeConfig = {
  sm: {
    container: "w-4 h-4",
    dot: "w-2 h-2",
    text: "text-[10px]",
    gap: "gap-1",
  },
  md: {
    container: "w-5 h-5 sm:w-6 sm:h-6",
    dot: "w-2.5 h-2.5 sm:w-3 sm:h-3",
    text: "text-xs",
    gap: "gap-1.5",
  },
  lg: {
    container: "w-7 h-7 sm:w-8 sm:h-8",
    dot: "w-3.5 h-3.5 sm:w-4 sm:h-4",
    text: "text-sm",
    gap: "gap-2",
  },
};

export function FoodLabel({ type, size = "md", showText = false }: FoodLabelProps) {
  const config = foodConfig[type];
  const sizes = sizeConfig[size];

  return (
    <div className={`inline-flex items-center ${sizes.gap}`}>
      {/* Dot in Square Symbol */}
      <div
        className={`${sizes.container} border-2 ${config.borderColor} flex items-center justify-center bg-white rounded-sm`}
      >
        <div className={`${sizes.dot} ${config.dotColor} rounded-full`} />
      </div>
      
      {/* Optional Text Label */}
      {showText && (
        <span className={`${sizes.text} font-semibold text-gray-700 dark:text-gray-300 uppercase`}>
          {config.label}
        </span>
      )}
    </div>
  );
}
