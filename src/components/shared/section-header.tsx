import { motion } from "framer-motion";

interface SectionHeaderProps {
  title: string;
  highlight?: string;
  description?: string;
  className?: string;
}

export function SectionHeader({ title, highlight, description, className = "" }: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className={`mb-8 sm:mb-10 md:mb-12 lg:mb-14 xl:mb-16 text-center ${className}`}
    >
      <h2 className="mb-3 sm:mb-4 md:mb-5 lg:mb-6 leading-tight">
        {title} {highlight && <span className="text-gradient-red">{highlight}</span>}
      </h2>
      {description && (
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4 sm:px-6 lg:px-0 leading-relaxed">
          {description}
        </p>
      )}
    </motion.div>
  );
}
