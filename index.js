#!/usr/bin/env node

/**
 * Black-Scholes Options Greeks Calculator
 * Zero external dependencies
 */

const fs = require('fs');

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Standard normal cumulative distribution function
 * Approximation using Abramowitz and Stegun formula
 */
function normCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

/**
 * Standard normal probability density function
 */
function normPDF(x) {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
}

// ============================================================================
// Black-Scholes Implementation
// ============================================================================

/**
 * Calculate d1 parameter for Black-Scholes
 */
function d1(S, K, r, sigma, T) {
  return (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
}

/**
 * Calculate d2 parameter for Black-Scholes
 */
function d2(S, K, r, sigma, T) {
  return d1(S, K, r, sigma, T) - sigma * Math.sqrt(T);
}

/**
 * Calculate Black-Scholes option price
 * @param {string} type - 'call' or 'put'
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} r - Risk-free rate (annual)
 * @param {number} sigma - Volatility (annual)
 * @param {number} T - Time to expiry (years)
 * @returns {number} Option price
 */
function blackScholesPrice(type, S, K, r, sigma, T) {
  if (T <= 0) return Math.max(type === 'call' ? S - K : K - S, 0);
  
  const d1Val = d1(S, K, r, sigma, T);
  const d2Val = d2(S, K, r, sigma, T);
  
  if (type === 'call') {
    return S * normCDF(d1Val) - K * Math.exp(-r * T) * normCDF(d2Val);
  } else {
    return K * Math.exp(-r * T) * normCDF(-d2Val) - S * normCDF(-d1Val);
  }
}

/**
 * Calculate all Greeks
 * @returns {object} All Greeks: delta, gamma, theta, vega, rho
 */
function calculateGreeks(type, S, K, r, sigma, T) {
  if (T <= 0) {
    return {
      delta: type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0
    };
  }
  
  const d1Val = d1(S, K, r, sigma, T);
  const d2Val = d2(S, K, r, sigma, T);
  const sqrtT = Math.sqrt(T);
  
  // Delta
  const delta = type === 'call' ? normCDF(d1Val) : normCDF(d1Val) - 1;
  
  // Gamma (same for calls and puts)
  const gamma = normPDF(d1Val) / (S * sigma * sqrtT);
  
  // Theta (per year, divide by 365 for daily)
  let theta;
  if (type === 'call') {
    theta = -(S * normPDF(d1Val) * sigma) / (2 * sqrtT) - r * K * Math.exp(-r * T) * normCDF(d2Val);
  } else {
    theta = -(S * normPDF(d1Val) * sigma) / (2 * sqrtT) + r * K * Math.exp(-r * T) * normCDF(-d2Val);
  }
  
  // Vega (per 1% change in volatility)
  const vega = S * sqrtT * normPDF(d1Val) / 100;
  
  // Rho (per 1% change in interest rate)
  const rho = type === 'call' 
    ? K * T * Math.exp(-r * T) * normCDF(d2Val) / 100
    : -K * T * Math.exp(-r * T) * normCDF(-d2Val) / 100;
  
  return { delta, gamma, theta, vega, rho };
}

// ============================================================================
// Implied Volatility Solver
// ============================================================================

/**
 * Calculate implied volatility using bisection method
 * @param {string} type - 'call' or 'put'
 * @param {number} marketPrice - Observed market price
 * @param {number} S - Spot price
 * @param {number} K - Strike price
 * @param {number} r - Risk-free rate
 * @param {number} T - Time to expiry (years)
 * @param {number} tolerance - Convergence tolerance
 * @param {number} maxIterations - Maximum iterations
 * @returns {number|null} Implied volatility or null if not found
 */
function impliedVolatility(type, marketPrice, S, K, r, T, tolerance = 0.0001, maxIterations = 100) {
  // Check for intrinsic value violations
  const intrinsic = type === 'call' ? Math.max(S - K * Math.exp(-r * T), 0) : Math.max(K * Math.exp(-r * T) - S, 0);
  if (marketPrice < intrinsic) {
    return null; // Price below intrinsic value
  }
  
  let sigmaLow = 0.001;  // 0.1% vol
  let sigmaHigh = 5.0;   // 500% vol
  
  for (let i = 0; i < maxIterations; i++) {
    const sigmaMid = (sigmaLow + sigmaHigh) / 2;
    const price = blackScholesPrice(type, S, K, r, sigmaMid, T);
    const diff = price - marketPrice;
    
    if (Math.abs(diff) < tolerance) {
      return sigmaMid;
    }
    
    if (diff > 0) {
      sigmaHigh = sigmaMid;
    } else {
      sigmaLow = sigmaMid;
    }
  }
  
  // Return midpoint if max iterations reached
  return (sigmaLow + sigmaHigh) / 2;
}

// ============================================================================
// CLI Interface
// ============================================================================

/**
 * Parse command-line arguments
 */
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      // Check if next arg is also a flag or if this is the last arg
      if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
        result[key] = true;  // Boolean flag
      } else {
        result[key] = args[i + 1];
        i++;
      }
    }
  }
  return result;
}

/**
 * Format and display results
 */
function displayResults(type, S, K, r, sigma, T, price, greeks, iv = null) {
  console.log('\n' + '='.repeat(60));
  console.log('BLACK-SCHOLES OPTIONS CALCULATOR');
  console.log('='.repeat(60));
  console.log('\nInput Parameters:');
  console.log(`  Option Type:      ${type.toUpperCase()}`);
  console.log(`  Spot Price:       $${S.toFixed(2)}`);
  console.log(`  Strike Price:     $${K.toFixed(2)}`);
  console.log(`  Risk-Free Rate:   ${(r * 100).toFixed(2)}%`);
  console.log(`  Volatility:       ${(sigma * 100).toFixed(2)}%`);
  console.log(`  Time to Expiry:   ${(T * 365).toFixed(0)} days (${T.toFixed(4)} years)`);
  
  if (iv !== null) {
    console.log(`\n  Implied Vol:      ${(iv * 100).toFixed(2)}%`);
  }
  
  console.log('\n' + '-'.repeat(60));
  console.log('RESULTS:');
  console.log('-'.repeat(60));
  console.log(`  Option Price:     $${price.toFixed(4)}`);
  console.log('\nGreeks:');
  console.log(`  Delta:            ${greeks.delta.toFixed(4)}`);
  console.log(`  Gamma:            ${greeks.gamma.toFixed(4)}`);
  console.log(`  Theta:            ${greeks.theta.toFixed(4)} (per year) / ${(greeks.theta / 365).toFixed(4)} (per day)`);
  console.log(`  Vega:             ${greeks.vega.toFixed(4)} (per 1% vol change)`);
  console.log(`  Rho:              ${greeks.rho.toFixed(4)} (per 1% rate change)`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Process batch CSV input
 */
function processBatchCSV() {
  let input = '';
  
  process.stdin.on('data', chunk => {
    input += chunk;
  });
  
  process.stdin.on('end', () => {
    const lines = input.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log('\n' + '='.repeat(80));
    console.log('BATCH BLACK-SCHOLES CALCULATION');
    console.log('='.repeat(80) + '\n');
    
    // Output header
    const outputHeaders = ['Type', 'Spot', 'Strike', 'Vol', 'Rate', 'Expiry(d)', 'Price', 'Delta', 'Gamma', 'Theta/d', 'Vega', 'Rho'];
    console.log(outputHeaders.join('\t'));
    console.log('-'.repeat(80));
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => {
        row[h.toLowerCase()] = values[idx];
      });
      
      const type = row.type || 'call';
      const S = parseFloat(row.spot || row.s);
      const K = parseFloat(row.strike || row.k);
      const sigma = parseFloat(row.vol || row.sigma || row.volatility);
      const r = parseFloat(row.rate || row.r);
      const days = parseFloat(row.expiry || row.days || row.t);
      const T = days / 365;
      
      const price = blackScholesPrice(type, S, K, r, sigma, T);
      const greeks = calculateGreeks(type, S, K, r, sigma, T);
      
      console.log([
        type,
        S.toFixed(2),
        K.toFixed(2),
        (sigma * 100).toFixed(1) + '%',
        (r * 100).toFixed(2) + '%',
        days.toFixed(0),
        price.toFixed(4),
        greeks.delta.toFixed(4),
        greeks.gamma.toFixed(4),
        (greeks.theta / 365).toFixed(4),
        greeks.vega.toFixed(4),
        greeks.rho.toFixed(4)
      ].join('\t'));
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  });
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
Black-Scholes Options Greeks Calculator

USAGE:
  
  Calculate option price and Greeks:
    node index.js --type <call|put> --spot <S> --strike <K> --vol <sigma> --rate <r> --expiry <days>
  
  Calculate implied volatility:
    node index.js --iv --type <call|put> --spot <S> --strike <K> --price <market_price> --rate <r> --expiry <days>
  
  Batch mode (CSV input):
    cat options.csv | node index.js --batch

PARAMETERS:
  --type      Option type: 'call' or 'put'
  --spot      Spot price (current underlying price)
  --strike    Strike price
  --vol       Volatility (annual, as decimal: 0.25 = 25%)
  --rate      Risk-free rate (annual, as decimal: 0.05 = 5%)
  --expiry    Time to expiry in days
  --price     Market price (for IV calculation)
  --iv        Calculate implied volatility
  --batch     Batch mode (read CSV from stdin)

EXAMPLES:

  Price a call option:
    node index.js --type call --spot 150 --strike 155 --vol 0.25 --rate 0.05 --expiry 30

  Calculate implied volatility:
    node index.js --iv --type call --spot 150 --strike 155 --price 3.50 --rate 0.05 --expiry 30

  Batch processing:
    echo "type,spot,strike,vol,rate,expiry
    call,150,155,0.25,0.05,30
    put,150,145,0.25,0.05,30" | node index.js --batch
`);
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Batch mode
  if (args.includes('--batch')) {
    processBatchCSV();
    return;
  }
  
  const params = parseArgs(args);
  
  // Validate required parameters
  const type = params.type;
  const S = parseFloat(params.spot);
  const K = parseFloat(params.strike);
  const r = parseFloat(params.rate);
  const days = parseFloat(params.expiry);
  const T = days / 365;
  
  if (!type || !S || !K || isNaN(r) || !days) {
    console.error('Error: Missing required parameters');
    showHelp();
    process.exit(1);
  }
  
  if (type !== 'call' && type !== 'put') {
    console.error('Error: Type must be "call" or "put"');
    process.exit(1);
  }
  
  // Implied volatility mode
  if (params.iv !== undefined || params.price !== undefined) {
    const marketPrice = parseFloat(params.price);
    if (!marketPrice) {
      console.error('Error: --price required for IV calculation');
      process.exit(1);
    }
    
    const iv = impliedVolatility(type, marketPrice, S, K, r, T);
    
    if (iv === null) {
      console.error('Error: Could not calculate implied volatility (price may be below intrinsic value)');
      process.exit(1);
    }
    
    // Calculate Greeks with implied vol
    const price = blackScholesPrice(type, S, K, r, iv, T);
    const greeks = calculateGreeks(type, S, K, r, iv, T);
    
    displayResults(type, S, K, r, iv, T, price, greeks, iv);
  } else {
    // Standard pricing mode
    const sigma = parseFloat(params.vol);
    if (!sigma) {
      console.error('Error: --vol required for pricing');
      process.exit(1);
    }
    
    const price = blackScholesPrice(type, S, K, r, sigma, T);
    const greeks = calculateGreeks(type, S, K, r, sigma, T);
    
    displayResults(type, S, K, r, sigma, T, price, greeks);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for testing
module.exports = {
  blackScholesPrice,
  calculateGreeks,
  impliedVolatility,
  normCDF,
  normPDF
};
