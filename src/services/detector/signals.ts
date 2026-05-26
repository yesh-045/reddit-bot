import { RedisClient } from '@devvit/public-api';
import { RedditUser, RedditPost, DetectionResult, SignalDetails } from '../../types/index.js';
import { RedisSchema } from '../../redis/schema.js';
import { diceCoefficient } from './similarity.js';
import { extractDomain, usernameSimilarity } from '../../utils/helpers.js';

async function fetchPostsInParallel(redis: RedisClient, ids: string[]): Promise<RedditPost[]> {
  const results = await Promise.allSettled(ids.map(id => RedisSchema.getPost(redis, id)));
  return results
    .filter((r): r is PromiseFulfilledResult<RedditPost> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

export async function detectSignals(
  redis: RedisClient,
  post: RedditPost,
  author: RedditUser
): Promise<DetectionResult> {
  const triggeredSignals: SignalDetails[] = [];
  const reasons: string[] = [];
  let totalScore = 0;

  const sharedDomains = new Set<string>();
  const sharedTitlePatterns = new Set<string>();
  const coPosters = new Set<string>();
  const subreddits = new Set<string>();
  const timeline: Array<{ timestamp: number; event: string; details?: string }> = [];

  const now = post.timestamp;
  timeline.push({ timestamp: now, event: 'Post analyzed', details: `Analyzing u/${author.username}` });

  if (author.accountAgeDays < 7) {
    const s: SignalDetails = {
      name: 'Fresh Account',
      score: 20,
      details: `Account age is ${author.accountAgeDays.toFixed(1)} days (< 7 days)`
    };
    triggeredSignals.push(s);
    totalScore += s.score;
    reasons.push(s.details);
    timeline.push({ timestamp: now, event: 'Fresh account detected', details: `Age: ${author.accountAgeDays.toFixed(1)}d` });
  } else if (author.accountAgeDays < 30) {
    const s: SignalDetails = {
      name: 'New Account',
      score: 10,
      details: `Account age is ${author.accountAgeDays.toFixed(1)} days (< 30 days)`
    };
    triggeredSignals.push(s);
    totalScore += s.score;
    reasons.push(s.details);
    timeline.push({ timestamp: now, event: 'New account detected', details: `Age: ${author.accountAgeDays.toFixed(1)}d` });
  }

  if (author.karma < 50) {
    const s: SignalDetails = {
      name: 'Low Karma',
      score: 15,
      details: `Account karma is ${author.karma} (< 50)`
    };
    triggeredSignals.push(s);
    totalScore += s.score;
    reasons.push(s.details);
    timeline.push({ timestamp: now, event: 'Low karma signal', details: `Karma: ${author.karma}` });
  }

  subreddits.add(post.subreddit);

  const domain = post.url ? extractDomain(post.url) : null;
  if (domain) sharedDomains.add(domain);

  if (domain) {
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const postIds = await RedisSchema.getDomainPosts(redis, domain, dayAgo, now);

    const otherPosts = await fetchPostsInParallel(redis, postIds.filter(pid => pid !== post.id));
    const uniqueSubs = new Set(otherPosts.map(p => p.subreddit));
    uniqueSubs.add(post.subreddit);
    uniqueSubs.forEach(s => subreddits.add(s));

    if (uniqueSubs.size >= 5) {
      const s: SignalDetails = {
        name: 'Domain Spamming',
        score: 30,
        details: `Same domain (${domain}) posted to ${uniqueSubs.size} different subreddits within 24h`
      };
      triggeredSignals.push(s);
      totalScore += s.score;
      reasons.push(s.details);
      timeline.push({ timestamp: now, event: 'Domain spamming detected', details: `${uniqueSubs.size} subreddits` });
    }
  }

  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  const subPosts = await RedisSchema.getSubredditPosts(redis, post.subreddit, threeDaysAgo, now);

  const otherSubPosts = await fetchPostsInParallel(redis, subPosts.filter(pid => pid !== post.id));
  for (const otherPost of otherSubPosts) {
    if (otherPost.author === post.author) continue;
    const similarity = diceCoefficient(post.title, otherPost.title);
    if (similarity >= 0.92) {
      const s: SignalDetails = {
        name: 'Duplicate Title',
        score: 25,
        details: `Title is ${(similarity * 100).toFixed(0)}% similar to post by u/${otherPost.author}`
      };
      triggeredSignals.push(s);
      totalScore += s.score;
      reasons.push(s.details);
      sharedTitlePatterns.add(otherPost.title);
      timeline.push({ timestamp: now, event: 'Duplicate title detected', details: `${(similarity * 100).toFixed(0)}% match` });
      break;
    }
  }

  const thirtyMinsAgo = now - 30 * 60 * 1000;
  const recentUserPosts = await RedisSchema.getUserPosts(redis, post.author, thirtyMinsAgo, now);
  const postCount = Math.max(recentUserPosts.length, 1);
  if (postCount >= 15) {
    const s: SignalDetails = {
      name: 'High Posting Velocity',
      score: 20,
      details: `Account posted ${postCount} posts in the last 30 minutes`
    };
    triggeredSignals.push(s);
    totalScore += s.score;
    reasons.push(s.details);
    timeline.push({ timestamp: now, event: 'High velocity detected', details: `${postCount} posts in 30m` });
  }

  if (domain) {
    const domainPostIds = await RedisSchema.getDomainPosts(redis, domain, now - 7 * 24 * 60 * 60 * 1000, now);
    const domainPosts = await fetchPostsInParallel(redis, domainPostIds);
    for (const otherPost of domainPosts) {
      if (otherPost.author !== post.author) {
        coPosters.add(otherPost.author.toLowerCase());
      }
    }
  }

  const allClusters = await RedisSchema.getAllClusters(redis);
  const isPartofActiveCampaign = allClusters.some(c =>
    (domain !== null && c.sharedDomain === domain) ||
    c.members.some(m => m.toLowerCase() === post.author.toLowerCase())
  );

  if (coPosters.size >= 3 || isPartofActiveCampaign) {
    const s: SignalDetails = {
      name: 'Suspicious Cluster',
      score: 40,
      details: `Multiple accounts (${coPosters.size + 1}) sharing same domains, titles, or schedule`
    };
    triggeredSignals.push(s);
    totalScore += s.score;
    reasons.push(s.details);
    timeline.push({ timestamp: now, event: 'Cluster detected', details: `${coPosters.size + 1} accounts linked` });
  }

  const bannedUsers = await RedisSchema.getBannedUsernames(redis);
  for (const banned of bannedUsers) {
    const similarity = usernameSimilarity(post.author, banned);
    if (similarity >= 0.85) {
      const s: SignalDetails = {
        name: 'Ban Evasion Signal',
        score: 25,
        details: `Clean username is ${(similarity * 100).toFixed(0)}% similar to banned user u/${banned}`
      };
      triggeredSignals.push(s);
      totalScore += s.score;
      reasons.push(s.details);
      timeline.push({ timestamp: now, event: 'Ban evasion detected', details: `${(similarity * 100).toFixed(0)}% match` });
      break;
    }
  }

  const riskScore = Math.min(totalScore, 100);

  return {
    riskScore,
    reasons,
    triggeredSignals,
    evidence: {
      sharedDomains: sharedDomains.size > 0 ? Array.from(sharedDomains) : undefined,
      sharedTitlePatterns: sharedTitlePatterns.size > 0 ? Array.from(sharedTitlePatterns) : undefined,
      coPosters: coPosters.size > 0 ? Array.from(coPosters) : undefined,
      subredditSpread: subreddits.size > 0 ? subreddits.size : undefined,
      timeframeHours: 24
    },
    timeline
  };
}
