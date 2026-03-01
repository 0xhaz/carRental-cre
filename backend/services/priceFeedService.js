import { ethers } from "ethers";

// Chainlink ETH/USD Price Feed on Sepolia
const ETH_USD_PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

// AggregatorV3Interface ABI
const PRICE_FEED_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
];

const RPC_URL = process.env.SEPOLIA_RPC_URL;

/**
 * Get or create ethers provider singleton
 */
let provider = null;
function getProvider() {
  if (!provider && RPC_URL) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

/**
 * Get Chainlink Price Feed contract instance
 */
function getPriceFeedContract() {
  const prov = getProvider();
  if (!prov) {
    throw new Error("RPC provider not configured");
  }
  return new ethers.Contract(ETH_USD_PRICE_FEED, PRICE_FEED_ABI, prov);
}

/**
 * Get the current ETH/USD price from Chainlink.
 * Chainlink returns price with 8 decimals (e.g., 250000000000 = $2500.00).
 * @returns {Promise<number>} ETH price in USD (e.g., 2500.00)
 */
export async function getEthPriceUsd() {
  try {
    const contract = getPriceFeedContract();
    const [, answer, , updatedAt] = await contract.latestRoundData();

    // Convert from 8 decimals to regular number
    const price = Number(answer) / 1e8;
    const timestamp = new Date(Number(updatedAt) * 1000);

    console.log(`[PriceFeed] ETH/USD: $${price.toFixed(2)} (updated: ${timestamp.toISOString()})`);

    return price;
  } catch (error) {
    console.error("Error fetching ETH price from Chainlink:", error.message);
    // Fallback to a reasonable default if Chainlink is unavailable
    console.warn("[PriceFeed] Using fallback price: $3000");
    return 3000;
  }
}

/**
 * Convert ETH amount to USD using live Chainlink price.
 * @param {number} ethAmount - Amount in ETH
 * @returns {Promise<number>} Amount in USD
 */
export async function ethToUsd(ethAmount) {
  const price = await getEthPriceUsd();
  return ethAmount * price;
}

/**
 * Convert USD amount to ETH using live Chainlink price.
 * @param {number} usdAmount - Amount in USD
 * @returns {Promise<number>} Amount in ETH
 */
export async function usdToEth(usdAmount) {
  const price = await getEthPriceUsd();
  return price > 0 ? usdAmount / price : 0;
}

// Cache price for 60 seconds to avoid excessive RPC calls
let cachedPrice = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

/**
 * Get cached ETH/USD price (cached for 60 seconds)
 * @returns {Promise<number>} ETH price in USD
 */
export async function getEthPriceUsdCached() {
  const now = Date.now();
  if (cachedPrice && now - cacheTime < CACHE_DURATION) {
    return cachedPrice;
  }

  cachedPrice = await getEthPriceUsd();
  cacheTime = now;
  return cachedPrice;
}
