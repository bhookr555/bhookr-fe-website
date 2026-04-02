# Constants Folder Structure

This folder contains all configuration constants used throughout the BHOOKR application, following the DRY (Don't Repeat Yourself) principle.

## Structure

```
src/constants/
├── index.ts                  # Barrel export for all constants
├── home.ts                   # Homepage hero slider & sections config
├── social-proof.ts           # Client transformations & trust badges
├── features.ts               # Features list configuration
├── pricing.ts                # Pricing plans & features
├── testimonials.ts           # Customer testimonials
└── animations.ts             # Framer Motion animation presets
```

## Usage

### Importing Constants

```typescript
// Import specific constants
import { HERO_SLIDES, FEATURES, PRICING_PLANS } from '@/constants';

// Or import everything
import * as Constants from '@/constants';
```

### Adding New Constants

1. **Choose the appropriate file** based on the constant's purpose
2. **Define TypeScript interfaces** for type safety
3. **Export the constant** with a descriptive name (use UPPER_SNAKE_CASE)
4. **Document complex structures** with JSDoc comments

### Example

```typescript
// In constants/features.ts

/**
 * Feature configuration for homepage
 */
export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const FEATURES: Feature[] = [
  {
    icon: "Truck",
    title: "Fresh Delivery",
    description: "Daily fresh meals"
  },
  // ... more features
];
```

## Benefits

- **Single Source of Truth**: All configuration in one place
- **Type Safety**: Full TypeScript support with interfaces
- **Easy Updates**: Change content without touching component logic
- **Reusability**: Use constants across multiple components
- **Maintainability**: Clear organization and documentation

## Files Overview

### `home.ts`
- Hero slider slides configuration
- Section titles and descriptions
- Auto-play settings

### `social-proof.ts`
- Client transformation stories
- Before/after data
- Trust badges (ratings, transformations count, etc.)

### `features.ts`
- Feature cards content
- Icon mappings
- Feature descriptions

### `pricing.ts`
- Pricing plan tiers
- Plan features and benefits
- Popular plan indicators

### `testimonials.ts`
- Customer testimonials
- Client information
- Ratings and feedback

### `animations.ts`
- Framer Motion variants
- Animation timing configurations
- Reusable animation utilities

## Convention Guidelines

1. **Naming**: Use descriptive, UPPER_SNAKE_CASE names
2. **Types**: Always define interfaces/types for complex data
3. **Documentation**: Add JSDoc comments for clarity
4. **Grouping**: Keep related constants together
5. **Immutability**: Use `as const` for readonly objects

## Related Documentation

- [Homepage Refactoring Guide](../devFiles/HOMEPAGE_REFACTORING.md)
- [Component Library](../components/shared/)
- [Developer Guide](../devFiles/DEVELOPER_GUIDE.md)
