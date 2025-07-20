// Twitter OAuth Debug Utility
// This file helps debug Twitter OAuth issues

export interface TwitterDebugInfo {
  clientId: string;
  redirectUri: string;
  hasClientSecret: boolean;
  environment: string;
  timestamp: string;
}

export function getTwitterDebugInfo(): TwitterDebugInfo {
  return {
    clientId: process.env.NEXT_PUBLIC_X_CLIENT_ID || 'NOT_SET',
    redirectUri: 'https://www.bblip.io/x/callback',
    hasClientSecret: !!process.env.X_CLIENT_SECRET,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };
}

export function logTwitterDebugInfo(): void {
  const debugInfo = getTwitterDebugInfo();
  
  console.log('🐦 Twitter OAuth Debug Info:');
  console.log('Client ID:', debugInfo.clientId);
  console.log('Redirect URI:', debugInfo.redirectUri);
  console.log('Has Client Secret:', debugInfo.hasClientSecret);
  console.log('Environment:', debugInfo.environment);
  console.log('Timestamp:', debugInfo.timestamp);
  
  // Check for common issues
  if (debugInfo.clientId === 'NOT_SET') {
    console.error('❌ NEXT_PUBLIC_X_CLIENT_ID is not set');
  }
  
  if (!debugInfo.hasClientSecret) {
    console.error('❌ X_CLIENT_SECRET is not set');
  }
  
  if (debugInfo.environment === 'development') {
    console.warn('⚠️  Running in development mode - make sure your Twitter App is configured for development');
  }
}

export function validateTwitterConfig(): boolean {
  const debugInfo = getTwitterDebugInfo();
  
  const issues: string[] = [];
  
  if (debugInfo.clientId === 'NOT_SET') {
    issues.push('NEXT_PUBLIC_X_CLIENT_ID is not set');
  }
  
  if (!debugInfo.hasClientSecret) {
    issues.push('X_CLIENT_SECRET is not set');
  }
  
  if (issues.length > 0) {
    console.error('❌ Twitter OAuth Configuration Issues:');
    issues.forEach(issue => console.error(`  - ${issue}`));
    return false;
  }
  
  console.log('✅ Twitter OAuth configuration appears valid');
  return true;
}

// Error message decoder for common Twitter API errors
export function decodeTwitterError(status: number, errorText: string): string {
  switch (status) {
    case 400:
      if (errorText.includes('invalid_client')) {
        return 'Invalid client ID or client secret. Check your Twitter App configuration.';
      }
      if (errorText.includes('invalid_grant')) {
        return 'Invalid authorization code. The code may have expired or been used already.';
      }
      if (errorText.includes('invalid_redirect_uri')) {
        return 'Invalid redirect URI. Make sure the callback URL matches your Twitter App configuration.';
      }
      if (errorText.includes('invalid_request')) {
        return 'Invalid request parameters. Check that all required parameters are present and valid.';
      }
      return `Bad Request (400): ${errorText}`;
      
    case 401:
      return 'Unauthorized. Check your client ID and client secret.';
      
    case 403:
      return 'Forbidden. Your Twitter App may not have the required permissions.';
      
    case 429:
      return 'Rate limit exceeded. Please wait before making another request.';
      
    case 500:
      return 'Twitter API server error. Please try again later.';
      
    default:
      return `HTTP ${status}: ${errorText}`;
  }
}

// Validate OAuth URL parameters
export function validateOAuthParams(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string[] {
  const issues: string[] = [];
  
  if (!params.clientId || params.clientId === 'NOT_SET') {
    issues.push('Client ID is missing or invalid');
  }
  
  if (!params.redirectUri || !params.redirectUri.startsWith('https://')) {
    issues.push('Redirect URI must be a valid HTTPS URL');
  }
  
  if (!params.state || params.state.length < 10) {
    issues.push('State parameter is too short or missing');
  }
  
  if (!params.codeChallenge || params.codeChallenge.length < 10) {
    issues.push('Code challenge is too short or missing');
  }
  
  return issues;
} 