import crypto from 'crypto';

// Mobil cihaz tespiti için utility fonksiyon
export function isMobileDevice(userAgent?: string): boolean {
  if (typeof window !== 'undefined') {
    // Client-side
    const ua = userAgent || navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  } else {
    // Server-side
    const ua = userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }
}

// Mobil cihazlarda X uygulamasına yönlendirme
export function redirectToXApp(authUrl: string, isMobile: boolean): void {
  if (typeof window === 'undefined') return;

  if (isMobile) {
    // Mobil cihazlarda X uygulamasına yönlendirme stratejileri
    
    // Platform tespiti
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    console.log('🔍 Mobil cihaz tespit edildi:', { isAndroid, isIOS, userAgent: navigator.userAgent });
    
    // OAuth parametrelerini al
    const urlParams = new URL(authUrl).searchParams;
    const clientId = urlParams.get('client_id');
    const redirectUri = urlParams.get('redirect_uri');
    const state = urlParams.get('state');
    const codeChallenge = urlParams.get('code_challenge');
    const scope = urlParams.get('scope');
    
    let targetUrl = authUrl; // Varsayılan olarak web URL'i kullan
    
    if (isAndroid) {
      // Android için farklı deep link formatları dene
      
      // 1. Intent URL formatı
      const intentUrl = `intent://twitter.com/i/oauth2/authorize?${urlParams.toString()}#Intent;scheme=https;package=com.twitter.android;S.browser_fallback_url=${encodeURIComponent(authUrl)};end`;
      
      // 2. X uygulaması için özel deep link (alternatif)
      const xDeepLink = `twitter://oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&state=${state}&code_challenge=${codeChallenge}&scope=${encodeURIComponent(scope || '')}`;
      
      // 3. X uygulaması için başka bir format
      const xAppLink = `twitter://authorize?${urlParams.toString()}`;
      
      targetUrl = intentUrl;
      console.log('📱 Android Intent URL:', targetUrl);
      console.log('📱 X Deep Link (alternatif 1):', xDeepLink);
      console.log('📱 X App Link (alternatif 2):', xAppLink);
      
      // Alternatif deep link'leri de dene
      setTimeout(() => {
        console.log('🔄 Alternatif deep link deneniyor:', xDeepLink);
        window.location.href = xDeepLink;
      }, 1000);
      
    } else if (isIOS) {
      // iOS için Universal Link kullan (X uygulaması otomatik açılacak)
      targetUrl = authUrl;
      console.log('🍎 iOS Universal Link:', targetUrl);
    }
    
    // X uygulamasını açmaya çalış
    console.log('🚀 X uygulamasına yönlendiriliyor:', targetUrl);
    
    // Önce deep link'i dene
    window.location.href = targetUrl;
    
    // 3 saniye sonra fallback URL'e yönlendir (uygulama açılmadıysa)
    setTimeout(() => {
      console.log('⏰ Fallback URL\'e yönlendiriliyor:', authUrl);
      window.location.href = authUrl;
    }, 3000);
  } else {
    // Desktop'ta normal yönlendirme
    console.log('💻 Desktop yönlendirmesi:', authUrl);
    window.location.href = authUrl;
  }
}

// X OAuth 2.0 Utility Functions
// Based on X Developer Documentation v2

export interface XOAuthSession {
  sessionId: string;
  codeVerifier: string;
  state: string;
  walletAddress: string;
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  verified?: boolean;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
}

export interface XTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// Generate PKCE code verifier (RFC 7636)
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.randomFillSync(array);
  return base64URLEncode(Buffer.from(array));
}

// Generate PKCE code challenge from verifier
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(verifier);
  return base64URLEncode(hash.digest());
}

// Base64URL encoding (RFC 4648)
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate random state for CSRF protection
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate session ID
export function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Validate OAuth state
export function validateState(state: string, savedState: string): boolean {
  return state === savedState;
}

// Build X OAuth authorization URL
export function buildAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
  isMobile?: boolean;
}): string {
  const {
    clientId,
    redirectUri,
    state,
    codeChallenge,
    scope = 'tweet.read users.read offline.access',
    isMobile = false
  } = params;

  // Mobil cihazlarda X uygulamasına deep link ile yönlendir
  if (isMobile) {
    // X uygulaması için doğru deep link formatı
    // twitter://oauth/authorize yerine web URL'i kullan ama mobil-optimized
    const url = new URL('https://twitter.com/i/oauth2/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('code_challenge', codeChallenge);
    
    return url.toString();
  }

  // Desktop için normal web URL'i kullan
  const url = new URL('https://twitter.com/i/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', codeChallenge);

  return url.toString();
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<XTokenResponse> {
  const { clientId, clientSecret, code, redirectUri, codeVerifier } = params;

  // Use the correct token endpoint
  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json();
}

// Get X user information
export async function getXUserInfo(accessToken: string): Promise<XUser> {
  const response = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url,verified,public_metrics',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('User info error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Failed to fetch user info: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const user = data.data;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    profile_image_url: user.profile_image_url,
    verified: user.verified || false,
    followers_count: user.public_metrics?.followers_count || 0,
    following_count: user.public_metrics?.following_count || 0,
    tweet_count: user.public_metrics?.tweet_count || 0
  };
}

// Refresh access token
export async function refreshAccessToken(params: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<XTokenResponse> {
  const { clientId, clientSecret, refreshToken } = params;

  const response = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token refresh error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
  }

  return response.json();
} 