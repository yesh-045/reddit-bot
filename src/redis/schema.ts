import { RedisClient } from '@devvit/public-api';
import { RedditUser, RedditPost, DomainStats, CampaignCluster, AlertDetail, ModeratorAction, SubredditRiskEntry } from '../types/index.js';
import { extractDomain } from '../utils/helpers.js';

// TTLs (in seconds)
const USER_TTL = 7 * 24 * 60 * 60; // 7 days
const POST_TTL = 3 * 24 * 60 * 60; // 3 days
const DOMAIN_TTL = 14 * 24 * 60 * 60; // 14 days
const CLUSTER_TTL = 14 * 24 * 60 * 60; // 14 days

// Keys
const keys = {
  user: (username: string) => `sentinel:user:${username.toLowerCase()}`,
  post: (postId: string) => `sentinel:post:${postId}`,
  domain: (domain: string) => `sentinel:domain:${domain.toLowerCase()}`,
  domainPosts: (domain: string) => `sentinel:domain:${domain.toLowerCase()}:posts`,
  userPosts: (username: string) => `sentinel:user:${username.toLowerCase()}:posts`,
  subredditPosts: (subreddit: string) => `sentinel:subreddit:${subreddit.toLowerCase()}:posts`,
  cluster: (clusterId: string) => `sentinel:cluster:${clusterId}`,
  clustersAll: 'sentinel:clusters:all',
  userCluster: (username: string) => `sentinel:user:${username.toLowerCase()}:cluster`,
  alertsRecent: 'sentinel:alerts:recent',
  bannedUsernames: 'sentinel:banned_usernames',
  settingsRiskThreshold: 'sentinel:settings:risk_threshold',
  settingsApiKey: 'sentinel:settings:api_key',
  settingsAiProvider: 'sentinel:settings:ai_provider',
  recentUsers: 'sentinel:recent:users',
  modAction: (itemType: string, itemId: string) => `sentinel:mod:${itemType}:${itemId}`,
  modActionsAll: 'sentinel:mod:actions',
  subredditHeatmap: 'sentinel:subreddit:heatmap'
};

export const RedisSchema = {
  // USER OPERATIONS
  async saveUser(redis: RedisClient, user: RedditUser): Promise<void> {
    const key = keys.user(user.username);
    await redis.hSet(key, {
      username: user.username,
      karma: String(user.karma),
      accountAgeDays: String(user.accountAgeDays),
      riskScore: String(user.riskScore),
      lastSeen: String(user.lastSeen)
    });
    await redis.expire(key, USER_TTL);
  },

  async getUser(redis: RedisClient, username: string): Promise<RedditUser | null> {
    const key = keys.user(username);
    const data = await redis.hGetAll(key);
    if (!data || !data.username) return null;
    return {
      username: data.username,
      karma: parseInt(data.karma || '0', 10),
      accountAgeDays: parseFloat(data.accountAgeDays || '0'),
      riskScore: parseInt(data.riskScore || '0', 10),
      lastSeen: parseInt(data.lastSeen || '0', 10)
    };
  },

  // POST OPERATIONS
  async savePost(redis: RedisClient, post: RedditPost): Promise<void> {
    const key = keys.post(post.id);
    await redis.hSet(key, {
      id: post.id,
      author: post.author,
      subreddit: post.subreddit,
      title: post.title,
      body: post.body,
      url: post.url,
      timestamp: String(post.timestamp)
    });
    await redis.expire(key, POST_TTL);

    // Track in indexes (sorted sets by timestamp)
    await redis.zAdd(keys.userPosts(post.author), { member: post.id, score: post.timestamp });
    await redis.expire(keys.userPosts(post.author), POST_TTL);

    await redis.zAdd(keys.subredditPosts(post.subreddit), { member: post.id, score: post.timestamp });
    await redis.expire(keys.subredditPosts(post.subreddit), POST_TTL);

    await this.trackSubredditActivity(redis, post.subreddit);

    if (post.url) {
      const domain = extractDomain(post.url);
      if (domain) {
        await redis.zAdd(keys.domainPosts(domain), { member: post.id, score: post.timestamp });
        await redis.expire(keys.domainPosts(domain), DOMAIN_TTL);

        const domainKey = keys.domain(domain);
        const exists = await redis.hGetAll(domainKey);
        const appearances = exists && exists.appearances ? parseInt(exists.appearances, 10) + 1 : 1;
        await redis.hSet(domainKey, {
          domain,
          appearances: String(appearances),
          riskScore: exists && exists.riskScore ? exists.riskScore : '0',
          lastSeen: String(post.timestamp)
        });
        await redis.expire(domainKey, DOMAIN_TTL);
      }
    }
  },

  async getPost(redis: RedisClient, postId: string): Promise<RedditPost | null> {
    const key = keys.post(postId);
    const data = await redis.hGetAll(key);
    if (!data || !data.id) return null;
    return {
      id: data.id,
      author: data.author,
      subreddit: data.subreddit,
      title: data.title,
      body: data.body,
      url: data.url,
      timestamp: parseInt(data.timestamp || '0', 10)
    };
  },

  // DOMAIN OPERATIONS
  async getDomainStats(redis: RedisClient, domain: string): Promise<DomainStats | null> {
    const key = keys.domain(domain);
    const data = await redis.hGetAll(key);
    if (!data || !data.domain) return null;
    return {
      domain: data.domain,
      appearances: parseInt(data.appearances || '0', 10),
      riskScore: parseInt(data.riskScore || '0', 10),
      lastSeen: parseInt(data.lastSeen || '0', 10)
    };
  },

  async getDomainPosts(redis: RedisClient, domain: string, minScore: number, maxScore: number): Promise<string[]> {
    const items = await redis.zRange(keys.domainPosts(domain), minScore, maxScore, { by: 'score' });
    return items.map(item => item.member);
  },

  async getUserPosts(redis: RedisClient, username: string, minScore: number, maxScore: number): Promise<string[]> {
    const items = await redis.zRange(keys.userPosts(username), minScore, maxScore, { by: 'score' });
    return items.map(item => item.member);
  },

  async getSubredditPosts(redis: RedisClient, subreddit: string, minScore: number, maxScore: number): Promise<string[]> {
    const items = await redis.zRange(keys.subredditPosts(subreddit), minScore, maxScore, { by: 'score' });
    return items.map(item => item.member);
  },

  // CLUSTER OPERATIONS
  async saveCluster(redis: RedisClient, cluster: CampaignCluster): Promise<void> {
    const key = keys.cluster(cluster.clusterId);
    await redis.hSet(key, {
      clusterId: cluster.clusterId,
      members: JSON.stringify(cluster.members),
      riskScore: String(cluster.riskScore),
      reason: JSON.stringify(cluster.reason),
      sharedDomain: cluster.sharedDomain || '',
      sharedTitlePattern: cluster.sharedTitlePattern || '',
      confidence: String(cluster.confidence),
      subreddits: JSON.stringify(cluster.subreddits || []),
      breakdown: JSON.stringify(cluster.breakdown || [])
    });
    await redis.expire(key, CLUSTER_TTL);

    // Save ID into the cluster list
    const rawList = await redis.get(keys.clustersAll);
    const list = rawList ? JSON.parse(rawList) as string[] : [];
    if (!list.includes(cluster.clusterId)) {
      list.push(cluster.clusterId);
      await redis.set(keys.clustersAll, JSON.stringify(list));
    }

    // Map members
    for (const member of cluster.members) {
      await redis.set(keys.userCluster(member), cluster.clusterId);
      await redis.expire(keys.userCluster(member), CLUSTER_TTL);
    }
  },

  async getCluster(redis: RedisClient, clusterId: string): Promise<CampaignCluster | null> {
    const key = keys.cluster(clusterId);
    const data = await redis.hGetAll(key);
    if (!data || !data.clusterId) return null;
    return {
      clusterId: data.clusterId,
      members: JSON.parse(data.members || '[]'),
      riskScore: parseInt(data.riskScore || '0', 10),
      reason: JSON.parse(data.reason || '[]'),
      sharedDomain: data.sharedDomain || undefined,
      sharedTitlePattern: data.sharedTitlePattern || undefined,
      confidence: parseFloat(data.confidence || '0'),
      subreddits: JSON.parse(data.subreddits || '[]'),
      breakdown: JSON.parse(data.breakdown || '[]')
    };
  },

  async getUserCluster(redis: RedisClient, username: string): Promise<CampaignCluster | null> {
    const clusterId = await redis.get(keys.userCluster(username));
    if (!clusterId) return null;
    return await this.getCluster(redis, clusterId);
  },

  async getAllClusters(redis: RedisClient): Promise<CampaignCluster[]> {
    const rawList = await redis.get(keys.clustersAll);
    const clusterIds = rawList ? JSON.parse(rawList) as string[] : [];
    const clusters: CampaignCluster[] = [];
    for (const id of clusterIds) {
      const cluster = await this.getCluster(redis, id);
      if (cluster) {
        clusters.push(cluster);
      }
    }
    return clusters;
  },

  // ALERT OPERATIONS
  async addAlert(redis: RedisClient, alert: AlertDetail): Promise<void> {
    const rawList = await redis.get(keys.alertsRecent);
    const list = rawList ? JSON.parse(rawList) as AlertDetail[] : [];
    list.unshift(alert);
    const trimmed = list.slice(0, 50);
    await redis.set(keys.alertsRecent, JSON.stringify(trimmed));
  },

  async getRecentAlerts(redis: RedisClient): Promise<AlertDetail[]> {
    const raw = await redis.get(keys.alertsRecent);
    return raw ? JSON.parse(raw) as AlertDetail[] : [];
  },

  // SETTINGS CONFIGURATIONS
  async getRiskThreshold(redis: RedisClient): Promise<number> {
    const threshold = await redis.get(keys.settingsRiskThreshold);
    return threshold ? parseInt(threshold, 10) : 70; // default 70
  },

  async setRiskThreshold(redis: RedisClient, threshold: number): Promise<void> {
    await redis.set(keys.settingsRiskThreshold, String(threshold));
  },

  // AI SETTINGS
  async setApiKey(redis: RedisClient, key: string): Promise<void> {
    await redis.set(keys.settingsApiKey, key);
  },

  async getApiKey(redis: RedisClient): Promise<string | undefined> {
    return await redis.get(keys.settingsApiKey) || undefined;
  },

  async setAiProvider(redis: RedisClient, provider: string): Promise<void> {
    await redis.set(keys.settingsAiProvider, provider);
  },

  async getAiProvider(redis: RedisClient): Promise<string | undefined> {
    return await redis.get(keys.settingsAiProvider) || undefined;
  },

  // BANNED USERNAMES
  async addBannedUsername(redis: RedisClient, username: string): Promise<void> {
    const rawList = await redis.get(keys.bannedUsernames);
    const list = rawList ? JSON.parse(rawList) as string[] : [];
    const lowerName = username.toLowerCase();
    if (!list.includes(lowerName)) {
      list.push(lowerName);
      await redis.set(keys.bannedUsernames, JSON.stringify(list));
    }
  },

  async getBannedUsernames(redis: RedisClient): Promise<string[]> {
    const raw = await redis.get(keys.bannedUsernames);
    return raw ? JSON.parse(raw) as string[] : [];
  },

  // RECENT USER SEARCHES
  async addRecentUser(redis: RedisClient, username: string): Promise<void> {
    const now = Date.now();
    await redis.zAdd(keys.recentUsers, { member: username.toLowerCase(), score: now });
  },

  async getRecentUsers(redis: RedisClient, count: number = 20): Promise<string[]> {
    const items = await redis.zRange(keys.recentUsers, 0, count - 1, { by: 'rank', reverse: true });
    return items.map(item => item.member);
  },

  // IMPACT METRICS
  async trackDomain(redis: RedisClient, domain: string): Promise<void> {
    const raw = await redis.get('sentinel:domains:all');
    const list = raw ? JSON.parse(raw) as string[] : [];
    const lower = domain.toLowerCase();
    if (!list.includes(lower)) { list.push(lower); await redis.set('sentinel:domains:all', JSON.stringify(list)); }
  },

  async getAllDomains(redis: RedisClient): Promise<string[]> {
    const raw = await redis.get('sentinel:domains:all');
    return raw ? JSON.parse(raw) as string[] : [];
  },

  async getAllUsers(redis: RedisClient): Promise<string[]> {
    const items = await redis.zRange(keys.recentUsers, 0, -1, { by: 'rank', reverse: true });
    return items.map(item => item.member);
  },

  // MODERATOR ACTIONS
  async performModAction(redis: RedisClient, action: ModeratorAction): Promise<void> {
    const key = keys.modAction(action.itemType, action.itemId);
    await redis.hSet(key, {
      itemType: action.itemType,
      itemId: action.itemId,
      action: action.action,
      moderator: action.moderator,
      timestamp: String(action.timestamp)
    });

    const raw = await redis.get(keys.modActionsAll);
    const list = raw ? JSON.parse(raw) as string[] : [];
    const entry = `${action.itemType}:${action.itemId}`;
    if (!list.includes(entry)) { list.push(entry); await redis.set(keys.modActionsAll, JSON.stringify(list)); }
  },

  async getModAction(redis: RedisClient, itemType: string, itemId: string): Promise<ModeratorAction | null> {
    const data = await redis.hGetAll(keys.modAction(itemType, itemId));
    if (!data || !data.itemId) return null;
    return { itemType: data.itemType as 'user' | 'campaign' | 'alert', itemId: data.itemId, action: data.action as 'reviewed' | 'dismissed' | 'investigating', moderator: data.moderator, timestamp: parseInt(data.timestamp || '0', 10) };
  },

  // SUBREDDIT HEATMAP
  async trackSubredditActivity(redis: RedisClient, subreddit: string): Promise<void> {
    const sub = subreddit.toLowerCase();
    const data = await redis.hGetAll(keys.subredditHeatmap);
    const count = data[sub] ? parseInt(data[sub], 10) + 1 : 1;
    data[sub] = String(count);
    await redis.hSet(keys.subredditHeatmap, data);
  },

  async getSubredditHeatmap(redis: RedisClient, limit: number = 10): Promise<SubredditRiskEntry[]> {
    const data = await redis.hGetAll(keys.subredditHeatmap);
    const entries: { subreddit: string; hitCount: number }[] = [];
    for (const [sub, count] of Object.entries(data)) {
      const c = parseInt(count, 10);
      entries.push({ subreddit: sub, hitCount: c });
    }
    entries.sort((a, b) => b.hitCount - a.hitCount);
    const topLimit = entries.slice(0, limit);
    return topLimit.map(e => ({
      subreddit: e.subreddit,
      hitCount: e.hitCount,
      riskLevel: e.hitCount >= 20 ? 'High' : e.hitCount >= 7 ? 'Medium' : 'Low',
      lastSeen: Date.now()
    }));
  },

  // CLEAR ALL DATA FOR SEEDER/RESET
  async clearAllData(redis: RedisClient): Promise<void> {
    await redis.del(keys.alertsRecent);
    await redis.del(keys.clustersAll);
    await redis.del(keys.bannedUsernames);
    await redis.del(keys.recentUsers);
    await redis.del('sentinel:domains:all');
    await redis.del('sentinel:users:all');
    await redis.del(keys.subredditHeatmap);
    await redis.del(keys.modActionsAll);
  }
};
