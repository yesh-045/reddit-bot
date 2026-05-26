import { diceCoefficient } from './similarity.js';
import { levenshteinDistance, usernameSimilarity, cleanUsername, cleanText } from '../../utils/helpers.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function runTests() {
  console.log('--- Starting Sentinel Heuristics Unit Tests ---');

  // Test 1: Username Cleaning
  assert(cleanUsername('Sc@mmerX1') === 'scammerx', 'cleanUsername Sc@mmerX1 -> scammerx');
  assert(cleanUsername('u/Bot_99_New!') === 'ubotnew', 'cleanUsername u/Bot_99_New! -> ubotnew');

  // Test 2: Text Cleaning
  assert(cleanText('Hello, World!  2026.') === 'hello world 2026', 'cleanText punctuation and spaces');

  // Test 3: Levenshtein Distance
  assert(levenshteinDistance('scammerx', 'scammerx') === 0, 'levenshtein identical strings');
  assert(levenshteinDistance('scammerx', 'scammerx1') === 1, 'levenshtein distance of 1');
  assert(levenshteinDistance('scammerx', 'scammery') === 1, 'levenshtein substitution distance of 1');

  // Test 4: Username Similarity Ratio
  const sim1 = usernameSimilarity('ScammerX', 'Sc@mmerX1');
  assert(sim1 >= 0.85, `usernameSimilarity ScammerX vs Sc@mmerX1 similarity is ${(sim1 * 100).toFixed(1)}%`);

  const sim2 = usernameSimilarity('legituser', 'scammerx');
  assert(sim2 < 0.5, `usernameSimilarity unrelated users similarity is ${(sim2 * 100).toFixed(1)}%`);

  // Test 5: Dice's Coefficient Title Similarity
  const title1 = 'Get your free $100 Amazon Gift Card now!';
  const title2 = 'FREE $100 Gift Card - Claim Today!';
  const diceSim1 = diceCoefficient(title1, title2);
  console.log(`Title Similarity (Dice): ${title1} vs ${title2} = ${(diceSim1 * 100).toFixed(1)}%`);
  assert(diceSim1 > 0.5, 'Dice coefficient similarity is reasonable for fuzzy overlap');

  const title3 = 'Look at this cute puppy I found on my porch!';
  const title4 = 'Look at this cute puppy found on my porch!';
  const diceSim2 = diceCoefficient(title3, title4);
  assert(diceSim2 >= 0.92, `Dice coefficient similarity for near-identical puppy titles is ${(diceSim2 * 100).toFixed(1)}%`);

  console.log('--- All Tests Completed Successfully ---');
}

// Run if executed directly
runTests();
