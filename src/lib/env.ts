/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and valid
 */

interface EnvConfig {
  // Firebase Client
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
  NEXT_PUBLIC_FIREBASE_DATABASE_URL?: string;

  // Firebase Admin (Server-side only)
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;

  // App Config
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL?: string;
}

/**
 * Validates that a required environment variable exists and is not a placeholder
 */
function validateRequired(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  // Check for common placeholder values
  const placeholders = ['your_', '_here', 'placeholder', 'example', 'changeme'];
  const lowerValue = value.toLowerCase();
  
  if (placeholders.some(placeholder => lowerValue.includes(placeholder))) {
    throw new Error(`Environment variable ${key} appears to contain a placeholder value: ${value}`);
  }

  return value;
}

/**
 * Validates optional environment variable
 */
function validateOptional(value: string | undefined): string | undefined {
  if (!value || value.trim() === '') {
    return undefined;
  }
  return value;
}

/**
 * Validates and returns all environment variables
 */
function validateEnv(): EnvConfig {
  const errors: string[] = [];

  try {
    const config: EnvConfig = {
      // Firebase Client - Required for app functionality
      NEXT_PUBLIC_FIREBASE_API_KEY: validateRequired(
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY
      ),
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: validateRequired(
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
      ),
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: validateRequired(
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ),
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: validateRequired(
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      ),
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: validateRequired(
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
      ),
      NEXT_PUBLIC_FIREBASE_APP_ID: validateRequired(
        'NEXT_PUBLIC_FIREBASE_APP_ID',
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      ),
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: validateOptional(
        process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
      ),
      NEXT_PUBLIC_FIREBASE_DATABASE_URL: validateOptional(
        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      ),

      // Firebase Admin - Optional for enhanced functionality
      FIREBASE_PROJECT_ID: validateOptional(process.env.FIREBASE_PROJECT_ID),
      FIREBASE_CLIENT_EMAIL: validateOptional(process.env.FIREBASE_CLIENT_EMAIL),
      FIREBASE_PRIVATE_KEY: validateOptional(process.env.FIREBASE_PRIVATE_KEY),

      // App Config
      NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
      NEXT_PUBLIC_APP_URL: validateOptional(process.env.NEXT_PUBLIC_APP_URL),
    };

    return config;
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\n💡 Please check your .env.local file and ensure all required variables are set.');
    console.error('📝 See .env.example for reference.');
    
    // Only fail build if Firebase client config is missing (not admin)
    const hasRequiredClientConfig = 
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (!hasRequiredClientConfig && process.env.NODE_ENV === 'production') {
      throw new Error('Environment validation failed. Cannot start application.');
    }
  }

  // Return partial config in development for better DX
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    NODE_ENV: (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

/**
 * Validated environment configuration
 * This will be validated once at startup
 */
export const env = validateEnv();

/**
 * Helper to check if Firebase Admin is configured
 */
export function isFirebaseAdminConfigured(): boolean {
  return !!(
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Helper to check if app is in production
 */
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Helper to check if app is in development
 */
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

