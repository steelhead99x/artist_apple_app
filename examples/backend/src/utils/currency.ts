/**
 * Currency Conversion Utility
 * 
 * Handles conversion between USD, USDC, and ETH for payment processing
 */

/**
 * Get current ETH/USD exchange rate
 * In production, this should call a real API like CoinGecko, Chainlink, or similar
 * For now, we'll use a mock rate
 */
export async function getEthUsdRate(): Promise<number> {
  // TODO: Replace with real API call
  // Example: https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd
  // For now, return a fixed rate (update this in production)
  return 2000.00; // 1 ETH = $2000 USD (mock rate)
}

/**
 * Convert USD/USDC to ETH
 * @param amount Amount in USD or USDC
 * @param currency Source currency ('USD' or 'USDC')
 * @returns Object with ETH amount and exchange rate used
 */
export async function convertToEth(amount: number, currency: 'USD' | 'USDC' | 'ETH'): Promise<{ ethAmount: number; exchangeRate: number }> {
  // If already in ETH, no conversion needed
  if (currency === 'ETH') {
    return {
      ethAmount: amount,
      exchangeRate: 1
    };
  }

  // Get current exchange rate
  const ethUsdRate = await getEthUsdRate();

  // USD and USDC are treated as 1:1 (USDC is a stablecoin pegged to USD)
  const usdAmount = amount;

  // Convert to ETH
  const ethAmount = usdAmount / ethUsdRate;

  return {
    ethAmount: parseFloat(ethAmount.toFixed(8)), // 8 decimal places for ETH
    exchangeRate: ethUsdRate
  };
}

/**
 * Convert ETH to USD
 * @param ethAmount Amount in ETH
 * @returns USD equivalent
 */
export async function convertEthToUsd(ethAmount: number): Promise<number> {
  const ethUsdRate = await getEthUsdRate();
  return ethAmount * ethUsdRate;
}

/**
 * Format currency for display
 * @param amount Numeric amount
 * @param currency Currency code
 * @returns Formatted string
 */
export function formatCurrency(amount: number, currency: string): string {
  if (currency === 'ETH') {
    return `${amount.toFixed(8)} ETH`;
  } else if (currency === 'USDC') {
    return `${amount.toFixed(2)} USDC`;
  } else {
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Validate payment currency
 * @param currency Currency to validate
 * @returns true if valid
 */
export function isValidCurrency(currency: string): boolean {
  return ['USD', 'USDC', 'ETH'].includes(currency);
}

