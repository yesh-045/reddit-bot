import { RedisClient } from '@devvit/public-api';
import { RedditPost, RedditUser, CampaignCluster } from '../../types/index.js';
import { RedisSchema } from '../../redis/schema.js';
import { diceCoefficient } from './similarity.js';
import { extractDomain } from '../../utils/helpers.js';

async function fetchPostsParallel(redis: RedisClient, ids: string[]): Promise<RedditPost[]> {
  const results = await Promise.allSettled(ids.map(id => RedisSchema.getPost(redis, id)));
  return results
    .filter((r): r is PromiseFulfilledResult<RedditPost> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

export async function processClusterDetection(
  redis: RedisClient,
  post: RedditPost,
  author: RedditUser
): Promise<CampaignCluster | null> {
  const now = post.timestamp;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const domain = post.url ? extractDomain(post.url) : null;

  if (domain) {
    const postIds = await RedisSchema.getDomainPosts(redis, domain, sevenDaysAgo, now);
    const domainPosts = await fetchPostsParallel(redis, postIds);

    const coAuthors = new Set<string>([author.username]);
    for (const p of domainPosts) {
      coAuthors.add(p.author);
    }

    if (coAuthors.size >= 3) {
      const members = Array.from(coAuthors);
      const clusterId = `cluster_domain_${domain.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const confidence = Math.min(50 + members.length * 8, 98);
      const riskScore = Math.min(60 + members.length * 5, 100);

      const cluster: CampaignCluster = {
        clusterId,
        members,
        riskScore,
        reason: [
          `Coordinated Domain Reuse: Same domain (${domain}) posted by ${members.length} accounts.`,
          `Confidence is ${confidence}% based on account grouping size and domain correlation.`
        ],
        sharedDomain: domain,
        confidence
      };

      await RedisSchema.saveCluster(redis, cluster);
      return cluster;
    }
  }

  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  const subPosts = await RedisSchema.getSubredditPosts(redis, post.subreddit, threeDaysAgo, now);

  const otherPosts = await fetchPostsParallel(redis, subPosts.filter(pid => pid !== post.id));

  const titleCoAuthors = new Set<string>([author.username]);
  for (const otherPost of otherPosts) {
    if (otherPost.author === post.author) continue;
    const sim = diceCoefficient(post.title, otherPost.title);
    if (sim >= 0.90) {
      titleCoAuthors.add(otherPost.author);
    }
  }

  if (titleCoAuthors.size >= 3) {
    const members = Array.from(titleCoAuthors);
    const titleSlug = post.title.toLowerCase().substring(0, 15).replace(/[^a-z0-9]/g, '_');
    const clusterId = `cluster_title_${titleSlug}`;
    const confidence = Math.min(60 + members.length * 7, 99);
    const riskScore = Math.min(70 + members.length * 4, 100);

    const cluster: CampaignCluster = {
      clusterId,
      members,
      riskScore,
      reason: [
        `Near-Duplicate Title Ring: ${members.length} accounts posting titles with 90%+ similarity.`,
        `Title pattern: "${post.title.substring(0, 40)}..."`
      ],
      sharedTitlePattern: post.title,
      confidence
    };

    await RedisSchema.saveCluster(redis, cluster);
    return cluster;
  }

  return null;
}
