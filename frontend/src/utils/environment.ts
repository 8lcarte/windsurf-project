/**
 * Environment configuration and detection utilities
 */

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isTest = process.env.NODE_ENV === 'test';

// Get current environment
export const getEnvironment = (): Environment => {
  if (isProduction) {
    // Check for staging subdomain/flag
    const isStaging = 
      window.location.hostname.includes('staging') || 
      process.env.REACT_APP_ENVIRONMENT === 'staging';
    
    return isStaging ? 'staging' : 'production';
  }
  return 'development';
};

// Environment-specific configuration
interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: {
    analytics: boolean;
    errorReporting: boolean;
    mockApi: boolean;
  };
}

const environmentConfigs: Record<Environment, EnvironmentConfig> = {
  development: {
    apiUrl: 'http://localhost:3001/v1',
    wsUrl: 'ws://localhost:3001',
    logLevel: 'debug',
    features: {
      analytics: false,
      errorReporting: false,
      mockApi: true
    }
  },
  staging: {
    apiUrl: 'https://api.staging.windsurf.com/v1',
    wsUrl: 'wss://ws.staging.windsurf.com',
    logLevel: 'debug',
    features: {
      analytics: true,
      errorReporting: true,
      mockApi: false
    }
  },
  production: {
    apiUrl: 'https://api.windsurf.com/v1',
    wsUrl: 'wss://ws.windsurf.com',
    logLevel: 'error',
    features: {
      analytics: true,
      errorReporting: true,
      mockApi: false
    }
  }
};

// Get environment configuration
export const getConfig = (): EnvironmentConfig => {
  const env = getEnvironment();
  return environmentConfigs[env];
};

// Feature flags
export const isFeatureEnabled = (feature: keyof EnvironmentConfig['features']): boolean => {
  const config = getConfig();
  return config.features[feature];
};

// Logging utility that respects environment log level
type LogLevel = EnvironmentConfig['logLevel'];
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export const log = (level: LogLevel, message: string, ...args: any[]) => {
  const config = getConfig();
  if (LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[config.logLevel]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args);
        break;
      case 'info':
        console.info(prefix, message, ...args);
        break;
      case 'warn':
        console.warn(prefix, message, ...args);
        break;
      case 'error':
        console.error(prefix, message, ...args);
        break;
    }
  }
};

// Validate environment variables
export const validateEnvironment = () => {
  const requiredVars = [
    'REACT_APP_API_KEY',
    'REACT_APP_AUTH_DOMAIN'
  ];

  const missingVars = requiredVars.filter(
    varName => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
};

// Initialize environment
export const initializeEnvironment = () => {
  validateEnvironment();
  
  const env = getEnvironment();
  const config = getConfig();
  
  log('info', `Initializing application in ${env} environment`, {
    apiUrl: config.apiUrl,
    features: config.features
  });
  
  // Set up global error handlers
  if (config.features.errorReporting) {
    window.onerror = (message, source, lineno, colno, error) => {
      log('error', 'Global error:', { message, source, lineno, colno, error });
      // Here you would typically send to error reporting service
    };
  }
  
  // Initialize analytics if enabled
  if (config.features.analytics) {
    // Initialize analytics service
    log('info', 'Analytics enabled');
  }
};