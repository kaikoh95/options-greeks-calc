# Options Greeks Calculator

A zero-dependency Node.js CLI tool for Black-Scholes options pricing and Greeks calculation.

## Features

- **Black-Scholes pricing** for European call and put options
- **All Greeks**: Delta, Gamma, Theta, Vega, Rho
- **Implied volatility solver** using bisection method
- **Batch mode** for processing multiple options via CSV
- **Zero dependencies** - pure Node.js implementation

## Installation

```bash
git clone https://github.com/kaikoh95/options-greeks-calc.git
cd options-greeks-calc
chmod +x index.js
```

Or install globally:

```bash
npm install -g .
```

## Usage

### Calculate Option Price and Greeks

```bash
node index.js --type call --spot 150 --strike 155 --vol 0.25 --rate 0.05 --expiry 30
```

**Parameters:**
- `--type` - Option type: `call` or `put`
- `--spot` - Spot price (current underlying price)
- `--strike` - Strike price
- `--vol` - Annual volatility (as decimal: 0.25 = 25%)
- `--rate` - Annual risk-free rate (as decimal: 0.05 = 5%)
- `--expiry` - Time to expiry in days

### Calculate Implied Volatility

```bash
node index.js --iv --type call --spot 150 --strike 155 --price 3.50 --rate 0.05 --expiry 30
```

**Parameters:**
- `--iv` - Flag to calculate implied volatility
- `--price` - Observed market price of the option

### Batch Mode

Process multiple options from CSV:

```bash
cat options.csv | node index.js --batch
```

**CSV Format:**
```csv
type,spot,strike,vol,rate,expiry
call,150,155,0.25,0.05,30
put,150,145,0.25,0.05,30
call,100,105,0.30,0.03,60
```

## Example Output

### Standard Pricing

```
============================================================
BLACK-SCHOLES OPTIONS CALCULATOR
============================================================

Input Parameters:
  Option Type:      CALL
  Spot Price:       $150.00
  Strike Price:     $155.00
  Risk-Free Rate:   5.00%
  Volatility:       25.00%
  Time to Expiry:   30 days (0.0822 years)

------------------------------------------------------------
RESULTS:
------------------------------------------------------------
  Option Price:     $1.8339

Greeks:
  Delta:            0.3521
  Gamma:            0.0347
  Theta:            -21.0534 (per year) / -0.0577 (per day)
  Vega:             0.1275 (per 1% vol change)
  Rho:              0.0378 (per 1% rate change)
============================================================
```

### Implied Volatility

```
============================================================
BLACK-SCHOLES OPTIONS CALCULATOR
============================================================

Input Parameters:
  Option Type:      CALL
  Spot Price:       $150.00
  Strike Price:     $155.00
  Risk-Free Rate:   5.00%
  Volatility:       30.52%
  Time to Expiry:   30 days (0.0822 years)

  Implied Vol:      30.52%

------------------------------------------------------------
RESULTS:
------------------------------------------------------------
  Option Price:     $3.5000

Greeks:
  Delta:            0.4019
  Gamma:            0.0342
  Theta:            -27.9420 (per year) / -0.0766 (per day)
  Vega:            0.1558 (per 1% vol change)
  Rho:              0.0433 (per 1% rate change)
============================================================
```

## Mathematical Formulas

### Black-Scholes Formula

**Call Option:**
```
C = S * N(d1) - K * e^(-rT) * N(d2)
```

**Put Option:**
```
P = K * e^(-rT) * N(-d2) - S * N(-d1)
```

Where:
```
d1 = [ln(S/K) + (r + σ²/2)T] / (σ√T)
d2 = d1 - σ√T
```

**Variables:**
- `S` = Spot price
- `K` = Strike price
- `r` = Risk-free rate
- `σ` = Volatility
- `T` = Time to expiry (years)
- `N()` = Cumulative standard normal distribution

### Greeks

**Delta (Δ)** - Rate of change of option price with respect to underlying price:
```
Call: Δ = N(d1)
Put:  Δ = N(d1) - 1
```

**Gamma (Γ)** - Rate of change of delta with respect to underlying price:
```
Γ = N'(d1) / (S * σ * √T)
```

**Theta (Θ)** - Rate of change of option price with respect to time:
```
Call: Θ = -(S * N'(d1) * σ) / (2√T) - r * K * e^(-rT) * N(d2)
Put:  Θ = -(S * N'(d1) * σ) / (2√T) + r * K * e^(-rT) * N(-d2)
```

**Vega (ν)** - Rate of change of option price with respect to volatility:
```
ν = S * √T * N'(d1)
```

**Rho (ρ)** - Rate of change of option price with respect to interest rate:
```
Call: ρ = K * T * e^(-rT) * N(d2)
Put:  ρ = -K * T * e^(-rT) * N(-d2)
```

Where `N'(x)` is the standard normal probability density function:
```
N'(x) = e^(-x²/2) / √(2π)
```

### Implied Volatility

Implied volatility is calculated using the **bisection method**, iteratively solving:
```
Market Price = Black-Scholes Price(σ)
```

The algorithm searches for σ in the range [0.001, 5.0] with a tolerance of 0.0001.

## Implementation Details

- **Zero external dependencies** - all mathematical functions implemented from scratch
- **Standard normal CDF** approximation using Abramowitz and Stegun formula
- **Bisection method** for implied volatility with 100 max iterations
- **Edge case handling** for expired options and boundary conditions
- **Precision**: All calculations use JavaScript's double-precision (64-bit) floats

## Use Cases

- **Options pricing** for European calls and puts
- **Risk management** with Greeks analysis
- **Volatility surface** construction with IV solver
- **Options strategy** evaluation
- **Batch analysis** of option portfolios
- **Educational** tool for understanding Black-Scholes model

## Limitations

- **European options only** - no early exercise
- **No dividends** - assumes non-dividend-paying underlying
- **Constant volatility** - real markets have volatility smiles/skews
- **Constant interest rate** - assumes flat term structure
- **No transaction costs** or market impact

## Contributing

Contributions welcome! Feel free to:
- Add American option pricing
- Implement dividend adjustments
- Add more implied volatility methods (Newton-Raphson, etc.)
- Add Greeks charts/visualization
- Add unit tests

## License

MIT

## Author

Created as a proof-of-concept options calculator with zero dependencies.

## References

- Black, F., & Scholes, M. (1973). "The Pricing of Options and Corporate Liabilities"
- Hull, J. C. "Options, Futures, and Other Derivatives"
- Abramowitz, M., & Stegun, I. A. (1964). "Handbook of Mathematical Functions"
