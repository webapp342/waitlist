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
      bnb: data.binancecoin?.usd || 0,  // No fallback - let UI handle loading state
      eth: data.ethereum?.usd || 0
    };
    
    // Update cache
    cachedPrices = prices;
    lastFetchTime = now;
    
    return prices;
  } catch (error) {
    console.error('Error fetching crypto prices from CoinGecko:', error);
    
    // Return zero prices if API fails - let UI handle loading state
    return {
      bnb: 0,
      eth: 0
    };
  }
};

// Get cached prices without fetching (useful for immediate display)
export const getCachedPrices = (): CryptoPrices => {
  return cachedPrices || { bnb: 0, eth: 0 };
}; 