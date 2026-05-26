const LEET_MAP: Record<string, string> = {
  '@': 'a', '4': 'a',
  '3': 'e',
  '|': 'i',
  '0': 'o',
  '5': 's', '$': 's',
  '7': 't',
  '2': 'z',
};

/**
 * Cleans a username to its core letters for ban-evasion detection.
 * Converts leetspeak chars to letters, removes remaining non-alpha, lowercases.
 * e.g., "Sc@mmerX1" -> "scammerx"
 */
export function cleanUsername(username: string): string {
  let cleaned = '';
  for (const ch of username.toLowerCase()) {
    if (ch >= 'a' && ch <= 'z') {
      cleaned += ch;
    } else if (LEET_MAP[ch]) {
      cleaned += LEET_MAP[ch];
    }
  }
  return cleaned;
}

/**
 * Standardizes text by converting to lowercase, removing punctuation,
 * and normalizing whitespace. Useful for text similarity matching.
 */
export function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the base domain name from a URL.
 * e.g., "https://www.google.com/search?q=123" -> "google.com"
 */
export function extractDomain(url: string): string | null {
  try {
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'http://' + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    let hostname = parsed.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Finds and extracts all unique domains mentioned inside a text block.
 */
export function extractDomainsFromText(text: string): string[] {
  const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,6})(?:\/[^\s]*)?/gi;
  const domains = new Set<string>();
  let match;
  
  while ((match = domainRegex.exec(text)) !== null) {
    const domain = match[1].toLowerCase();
    // Filter out common platform domains if they aren't promotional
    if (domain !== 'reddit.com' && domain !== 'preview.redd.it' && domain !== 'imgur.com') {
      domains.add(domain);
    }
  }
  
  return Array.from(domains);
}

/**
 * Computes the Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // Deletion
          matrix[i][j - 1] + 1,      // Insertion
          matrix[i - 1][j - 1] + 1    // Substitution
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Returns similarity ratio (0 to 1) between two usernames based on Levenshtein distance.
 */
export function usernameSimilarity(name1: string, name2: string): number {
  const clean1 = cleanUsername(name1);
  const clean2 = cleanUsername(name2);
  if (clean1.length === 0 || clean2.length === 0) return 0;
  
  const distance = levenshteinDistance(clean1, clean2);
  const maxLength = Math.max(clean1.length, clean2.length);
  return 1 - distance / maxLength;
}

export function formatRelativeTime(timestamp: number): string {
  const elapsed = Date.now() - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
