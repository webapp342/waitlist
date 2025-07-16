// Crypto price fetching service using CoinGecko API
export interface CryptoPrices {
  bnb: number;
  eth: number;
}

let cachedPrices: CryptoPrices | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export const fetchCryptoPrices = async (): Promise<CryptoPrices> => {
  // Return cached prices if still valid
  const now = Date.now();
  if (cachedPrices && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedPrices;
  }

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin,ethereum&vs_currencies=usd');
    const data = await response.json();
    
    const prices: CryptoPrices = {
      bnb: data.binancecoin?.usd || 700,  // Fallback to reasonable defaults
      eth: data.ethereum?.usd || 3500
    };
    
    // Update cache
    cachedPrices = prices;
    lastFetchTime = now;
    
    return prices;
  } catch (error) {
    console.error('Error fetching crypto prices from CoinGecko:', error);
    
    // Return fallback prices if API fails
    return {
      bnb: 700,
      eth: 3500
    };
  }
};

// Get cached prices without fetching (useful for immediate display)
export const getCachedPrices = (): CryptoPrices => {
  return cachedPrices || { bnb: 700, eth: 3500 };
}; 