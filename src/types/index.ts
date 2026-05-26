export interface RedditUser {
  username: string;
  karma: number;
  accountAgeDays: number;
  riskScore: number;
  lastSeen: number;
}

export interface RedditPost {
  id: string;
  author: string;
  subreddit: string;
  title: string;
  body: string;
  url: string;
  timestamp: number;
}

export interface DomainStats {
  domain: string;
  appearances: number;
  riskScore: number;
  lastSeen: number;
}

export interface CampaignCluster {
  clusterId: string;
  members: string[]; // usernames
  riskScore: number;
  reason: string[];
  sharedDomain?: string;
  sharedTitlePattern?: string;
  confidence: number;
  subreddits?: string[];
  breakdown?: { label: string; points: number }[];
}

export interface SignalDetails {
  name: string;
  score: number;
  details: string;
}

export interface DetectionResult {
  riskScore: number;
  reasons: string[];
  triggeredSignals: SignalDetails[];
  evidence: {
    sharedDomains?: string[];
    sharedTitlePatterns?: string[];
    coPosters?: string[];
    subredditSpread?: number;
    timeframeHours?: number;
  };
  timeline: Array<{
    timestamp: number;
    event: string;
    details?: string;
  }>;
}

export interface AlertDetail {
  id: string;
  postId: string;
  username: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  reason: string;
  timestamp: number;
}

export interface ModeratorAction {
  itemType: 'user' | 'campaign' | 'alert';
  itemId: string;
  action: 'reviewed' | 'dismissed' | 'investigating';
  moderator: string;
  timestamp: number;
}

export interface SubredditRiskEntry {
  subreddit: string;
  hitCount: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  lastSeen: number;
}
