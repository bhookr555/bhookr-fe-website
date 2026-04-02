import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

type IconName = keyof typeof LucideIcons;

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

/**
 * Dynamically renders a Lucide icon by name
 */
export function DynamicIcon({ name, className = "", size }: DynamicIconProps) {
  const IconComponent = LucideIcons[name as IconName] as LucideIcon;
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in lucide-react`);
    return null;
  }

  return <IconComponent className={className} size={size} />;
}
