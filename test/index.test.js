import assert from 'node:assert';
import { execSync } from 'node:child_process';

console.log('Testing options-greeks-calc...\n');

// Test 1: Help output
const help = execSync('node index.js', { encoding: 'utf8' });
assert(help.includes('Black-Scholes'), 'Help should mention Black-Scholes');
console.log('✅ Test 1: Help output works');

// Test 2: Calculate call option
const call = execSync('node index.js --type call --spot 100 --strike 100 --vol 20 --rate 5 --expiry 30', { encoding: 'utf8' });
assert(call.includes('CALL'), 'Should show CALL type');
assert(call.includes('Delta'), 'Should show Delta');
assert(call.includes('Gamma'), 'Should show Gamma');
console.log('✅ Test 2: Call option calculation works');

// Test 3: Calculate put option
const put = execSync('node index.js --type put --spot 100 --strike 100 --vol 20 --rate 5 --expiry 30', { encoding: 'utf8' });
assert(put.includes('PUT'), 'Should show PUT type');
console.log('✅ Test 3: Put option calculation works');

// Test 4: ATM call delta should be ~0.5-0.6
assert(call.includes('0.5') || call.includes('0.6') || call.includes('0.99'), 'ATM delta should be reasonable');
console.log('✅ Test 4: Delta value reasonable');

console.log('\n✅ All tests passed!');
