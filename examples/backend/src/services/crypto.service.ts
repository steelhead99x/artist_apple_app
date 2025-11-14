import { ethers } from 'ethers';

// Platform wallet address for receiving payments (set in environment)
const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS;
const RPC_URL = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY';

// Initialize provider (ethers v6 API)
const provider = new ethers.JsonRpcProvider(RPC_URL);

export interface CryptoPayment {
  transactionHash: string;
  from: string;
  to: string;
  amount: string; // in ETH
  amountUSD: number;
  blockNumber?: number;
  confirmations: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface VerifyPaymentParams {
  transactionHash: string;
  expectedAmount: number; // in USD
  fromAddress?: string; // Optional: verify sender
}

/**
 * Get current ETH to USD exchange rate
 * In production, use a price oracle or API like CoinGecko
 */
export async function getETHtoUSDRate(): Promise<number> {
  // This is a placeholder - in production, fetch from a price API
  // For now, return a fixed rate for testing
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
    const data = await response.json() as { ethereum: { usd: number } };
    return data.ethereum.usd;
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    // Fallback rate (update this periodically or use another method)
    return 2000; // $2000 per ETH as fallback
  }
}

/**
 * Calculate ETH amount from USD
 */
export async function calculateETHAmount(usdAmount: number): Promise<string> {
  const ethRate = await getETHtoUSDRate();
  const ethAmount = usdAmount / ethRate;
  return ethAmount.toFixed(6); // 6 decimal places
}

/**
 * Verify a crypto payment transaction
 */
export async function verifyPayment(params: VerifyPaymentParams): Promise<CryptoPayment> {
  if (!PLATFORM_WALLET_ADDRESS) {
    throw new Error('Platform wallet address not configured');
  }

  try {
    // Get transaction details
    const tx = await provider.getTransaction(params.transactionHash);
    
    if (!tx) {
      throw new Error('Transaction not found');
    }

    // Get transaction receipt to check if it was mined
    const receipt = await provider.getTransactionReceipt(params.transactionHash);
    
    if (!receipt) {
      // Transaction not mined yet
      return {
        transactionHash: params.transactionHash,
        from: tx.from,
        to: tx.to || '',
        amount: ethers.formatEther(tx.value),
        amountUSD: 0, // Calculate after confirmation
        confirmations: 0,
        status: 'pending',
      };
    }

    // Verify recipient is the platform wallet
    if (tx.to?.toLowerCase() !== PLATFORM_WALLET_ADDRESS.toLowerCase()) {
      throw new Error(`Payment sent to wrong address. Expected: ${PLATFORM_WALLET_ADDRESS}, Got: ${tx.to}`);
    }

    // Verify sender if provided
    if (params.fromAddress && tx.from.toLowerCase() !== params.fromAddress.toLowerCase()) {
      throw new Error(`Payment from wrong address. Expected: ${params.fromAddress}, Got: ${tx.from}`);
    }

    // Calculate USD equivalent
    const ethAmount = parseFloat(ethers.formatEther(tx.value));
    const ethRate = await getETHtoUSDRate();
    const amountUSD = ethAmount * ethRate;

    // Verify amount (allow 5% slippage for price fluctuations)
    const minAcceptable = params.expectedAmount * 0.95;
    const maxAcceptable = params.expectedAmount * 1.05;
    
    if (amountUSD < minAcceptable || amountUSD > maxAcceptable) {
      throw new Error(
        `Payment amount mismatch. Expected: $${params.expectedAmount}, Got: $${amountUSD.toFixed(2)}`
      );
    }

    // Check transaction status
    const status = receipt.status === 1 ? 'confirmed' : 'failed';
    
    // Get current block number for confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = receipt.blockNumber ? currentBlock - receipt.blockNumber : 0;

    return {
      transactionHash: params.transactionHash,
      from: tx.from,
      to: tx.to || '',
      amount: ethers.formatEther(tx.value),
      amountUSD,
      blockNumber: receipt.blockNumber,
      confirmations,
      status,
    };
  } catch (error: any) {
    console.error('Error verifying crypto payment:', error);
    throw new Error(`Failed to verify crypto payment: ${error.message}`);
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(transactionHash: string): Promise<'pending' | 'confirmed' | 'failed' | 'not_found'> {
  try {
    const receipt = await provider.getTransactionReceipt(transactionHash);
    
    if (!receipt) {
      // Check if transaction exists
      const tx = await provider.getTransaction(transactionHash);
      return tx ? 'pending' : 'not_found';
    }

    return receipt.status === 1 ? 'confirmed' : 'failed';
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return 'not_found';
  }
}

/**
 * Wait for transaction confirmation
 * @param transactionHash Transaction hash to wait for
 * @param confirmations Number of block confirmations to wait for (default: 1)
 * @param timeout Timeout in milliseconds (default: 5 minutes)
 */
export async function waitForConfirmation(
  transactionHash: string,
  confirmations: number = 1,
  timeout: number = 300000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await provider.getTransactionReceipt(transactionHash);
      
      if (receipt) {
        const currentBlock = await provider.getBlockNumber();
        const txConfirmations = receipt.blockNumber ? currentBlock - receipt.blockNumber : 0;
        
        if (txConfirmations >= confirmations) {
          return receipt.status === 1;
        }
      }
      
      // Wait 5 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error('Error waiting for confirmation:', error);
    }
  }
  
  throw new Error('Transaction confirmation timeout');
}

export default {
  getETHtoUSDRate,
  calculateETHAmount,
  verifyPayment,
  getTransactionStatus,
  waitForConfirmation,
};

