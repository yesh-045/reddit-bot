import { cleanText } from '../../utils/helpers.js';

/**
 * Generates character bigrams for a given string after text normalization.
 */
export function getBigrams(str: string): Set<string> {
  const clean = cleanText(str);
  const bigrams = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) {
    bigrams.add(clean.substring(i, i + 2));
  }
  return bigrams;
}

/**
 * Computes Dice's Coefficient (fuzzy text similarity ratio) between two strings.
 * Returns a value between 0.0 (no similarity) and 1.0 (identical bigrams).
 */
export function diceCoefficient(str1: string, str2: string): number {
  const b1 = getBigrams(str1);
  const b2 = getBigrams(str2);
  
  if (b1.size === 0 && b2.size === 0) return 1.0;
  if (b1.size === 0 || b2.size === 0) return 0.0;
  
  let intersection = 0;
  for (const bigram of b1) {
    if (b2.has(bigram)) {
      intersection++;
    }
  }
  
  return (2 * intersection) / (b1.size + b2.size);
}
