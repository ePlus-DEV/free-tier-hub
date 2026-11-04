/**
 * Presentation-only compact quantities for Free Tier Hub.
 * Keep canonical catalog text, SEO metadata, search index and official limits
 * unchanged. Truncate instead of rounding up, so 999,999 never becomes 1M.
 *
 * Input examples: 100000, 100,000, 100.000, 1,000,000, 1.000.000.
 * Output examples: 100K, 100K, 100K, 1M, 1M.
 * For numbers below 100K: 1000 => 1.000, 10000 => 10.000.
 */
const THRESHOLD = 100_000;
const GROUP_THRESHOLD = 1_000;
const groupThousands = number => String(number).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const UNITS = [
  [1_000_000_000_000, 'T', 2],
  [1_000_000_000, 'B', 2],
  [1_000_000, 'M', 2],
  [1_000, 'K', 1],
];

export function compactNumber(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return String(value);
  if (Math.abs(value) < GROUP_THRESHOLD) return String(value);
  if (Math.abs(value) < THRESHOLD) return groupThousands(value);
  const sign = value < 0 ? '-' : '';
  const number = Math.abs(value);
  for (const [divisor, suffix, digits] of UNITS) {
    if (number < divisor) continue;
    const whole = Math.floor(number / divisor);
    const fractionBase = 10 ** digits;
    const fraction = Math.floor(((number % divisor) * fractionBase) / divisor);
    const fractionText = String(fraction).padStart(digits, '0').replace(/0+$/, '');
    return sign + whole + (fractionText ? '.' + fractionText : '') + suffix;
  }
  return String(value);
}

// Matches only complete, well-formed grouped or ungrouped integer values.
// Never touch decimals with arbitrary precision, versions, paths or URLs.
const QUANTITY = /(?<![\w./])(?:\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+|\d{4,})(?![\w.])/g;

export function compactQuantityText(value) {
  const original = String(value ?? '');
  return original.replace(QUANTITY, token => {
    if (token.includes('.') && token.split('.').length === 4 &&
        token.split('.').every(part => Number(part) <= 255)) {
      return token; // Do not turn IPv4 addresses into quantities.
    }
    // A bare four-digit calendar year is not a quota, unlike an explicitly
    // grouped number such as 2,026. Keep dates and release years readable.
    if (/^(?:19|20)\d{2}$/.test(token)) return token;
    const digits = token.replace(/[,.]/g, '');
    const number = Number(digits);
    if (!Number.isSafeInteger(number) || number < GROUP_THRESHOLD) return token;
    return compactNumber(number);
  });
}
