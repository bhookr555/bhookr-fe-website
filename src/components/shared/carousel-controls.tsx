import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselControlsProps {
  currentIndex: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export function CarouselControls({
  currentIndex,
  totalItems,
  onPrevious,
  onNext,
  className = ""
}: CarouselControlsProps) {
  if (totalItems <= 1) return null;

  return (
    <>
      {/* Previous Button */}
      <button
        onClick={onPrevious}
        className="absolute left-0 md:-left-16 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-[#E31E24] p-3 rounded-full shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="Previous"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* Next Button */}
      <button
        onClick={onNext}
        className="absolute right-0 md:-right-16 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-[#E31E24] p-3 rounded-full shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="Next"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Dots Indicator */}
      <div className={`flex justify-center gap-2 mt-8 ${className}`}>
        {Array.from({ length: totalItems }).map((_, index) => (
          <button
            key={index}
            onClick={() => {
              const diff = index - currentIndex;
              if (diff > 0) {
                for (let i = 0; i < diff; i++) onNext();
              } else if (diff < 0) {
                for (let i = 0; i < Math.abs(diff); i++) onPrevious();
              }
            }}
            className={`h-3 w-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? "bg-[#E31E24] w-8"
                : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
            }`}
            aria-label={`Go to item ${index + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400 font-medium">
        {currentIndex + 1} / {totalItems}
      </div>
    </>
  );
}
