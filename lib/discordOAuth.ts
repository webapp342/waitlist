import crypto from 'crypto';

// Discord OAuth2 Configuration
export const DISCORD_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '',
  clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  redirectUri: process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || 'https://bblip.io/discord/callback',
  scope: 'identify',
  apiBase: 'https://discord.com/api/v10'
};

// Generate random state for OAuth security
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate session ID for tracking OAuth flow
export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Build Discord OAuth authorization URL
export function buildDiscordAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope: string;
}): string {
  const { clientId, redirectUri, state, scope } = params;
  
  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  
  return url.toString();
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}> {
  const requestBody = new URLSearchParams({
    client_id: DISCORD_CONFIG.clientId,
    client_secret: DISCORD_CONFIG.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: DISCORD_CONFIG.redirectUri,
  });

  console.log('Discord token exchange request:', {
    client_id: DISCORD_CONFIG.clientId,
    client_secret: DISCORD_CONFIG.clientSecret ? 'present' : 'missing',
    grant_type: 'authorization_code',
    code: code ? 'present' : 'missing',
    redirect_uri: DISCORD_CONFIG.redirectUri
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  });

  console.log('Discord token exchange response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Discord token exchange error response:', errorText);
    throw new Error(`Discord token exchange failed: ${response.statusText} - ${errorText}`);
  }

  const tokenData = await response.json();
  console.log('Discord token exchange successful:', {
    access_token: tokenData.access_token ? 'present' : 'missing',
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
    refresh_token: tokenData.refresh_token ? 'present' : 'missing',
    scope: tokenData.scope
  });

  return tokenData;
}

// Get Discord user information
export async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified: boolean;
  locale: string;
  mfa_enabled: boolean;
  flags: number;
  premium_type: number;
  public_flags: number;
}> {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Discord user: ${response.statusText}`);
  }

  return response.json();
}

// Get Discord user guilds (servers)
export async function getDiscordUserGuilds(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
  permissions_new: string;
}>> {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Discord guilds: ${response.statusText}`);
  }

  return response.json();
}

// Validate Discord configuration
export function validateDiscordConfig(): boolean {
  return !!(DISCORD_CONFIG.clientId && DISCORD_CONFIG.clientSecret && DISCORD_CONFIG.redirectUri);
}

// Check if device is mobile
export function isMobileDevice(userAgent: string): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

// Generate Discord avatar URL
export function getDiscordAvatarUrl(userId: string, avatar: string | null, discriminator: string): string {
  if (avatar) {
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  }
  
  // Default avatar based on discriminator
  const defaultAvatarId = parseInt(discriminator) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarId}.png`;
}

// Check if user is member of specific guild
export async function isUserInGuild(accessToken: string, guildId: string): Promise<boolean> {
  try {
    // Get user's guilds and check if the target guild is in the list
    const response = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to get user guilds:', response.status, response.statusText);
      return false;
    }

    const guilds = await response.json();
    const isMember = guilds.some((guild: any) => guild.id === guildId);
    
    console.log('Guild membership check:', {
      guildId,
      userGuilds: guilds.map((g: any) => ({ id: g.id, name: g.name })),
      isMember
    });
    
    return isMember;
  } catch (error) {
    console.error('Error checking guild membership:', error);
    return false;
  }
}

// Refresh Discord access token
export async function refreshDiscordToken(refreshToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}> {
  const requestBody = new URLSearchParams({
    client_id: DISCORD_CONFIG.clientId,
    client_secret: DISCORD_CONFIG.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  console.log('Discord token refresh request:', {
    client_id: DISCORD_CONFIG.clientId,
    client_secret: DISCORD_CONFIG.clientSecret ? 'present' : 'missing',
    grant_type: 'refresh_token',
    refresh_token: refreshToken ? 'present' : 'missing'
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  });

  console.log('Discord token refresh response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Discord token refresh error response:', errorText);
    throw new Error(`Discord token refresh failed: ${response.statusText} - ${errorText}`);
  }

  const tokenData = await response.json();
  console.log('Discord token refresh successful:', {
    access_token: tokenData.access_token ? 'present' : 'missing',
    token_type: tokenData.token_type,
    expires_in: tokenData.expires_in,
    refresh_token: tokenData.refresh_token ? 'present' : 'missing',
    scope: tokenData.scope
  });

  return tokenData;
}

// Validate OAuth parameters
export function validateOAuthParams(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string[] {
  const issues: string[] = [];
  
  if (!params.clientId) {
    issues.push('Discord Client ID is required');
  }
  
  if (!params.redirectUri) {
    issues.push('Redirect URI is required');
  }
  
  if (!params.state) {
    issues.push('State parameter is required');
  }
  
  if (params.state.length < 32) {
    issues.push('State parameter must be at least 32 characters');
  }
  
  return issues;
} 