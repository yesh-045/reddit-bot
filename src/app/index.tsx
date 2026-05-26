import { Devvit } from '@devvit/public-api';
import { AppHome } from '../pages/AppHome.js';
import { RedisSchema } from '../redis/schema.js';
import { detectSignals } from '../services/detector/signals.js';
import { processClusterDetection } from '../services/detector/cluster.js';

// Configure Devvit application capabilities
Devvit.configure({
  redditAPI: true,
  redis: true,
});

// Configure installation settings (for moderators)
Devvit.addSettings([
  {
    name: 'api_key',
    label: 'Gemini / OpenAI API Key',
    type: 'string',
    scope: 'app',
    isSecret: true,
  },
  {
    name: 'ai_provider',
    label: 'AI Provider',
    type: 'select',
    options: [
      { label: 'Gemini Flash', value: 'gemini' },
      { label: 'GPT-5o-mini', value: 'openai' }
    ],
    scope: 'app',
    defaultValue: ['gemini'],
  },
  {
    name: 'risk_threshold',
    label: 'Risk Score Threshold',
    type: 'number',
    defaultValue: 70,
    scope: 'installation',
  }
]);

// 1. POSTSUBMIT TRIGGER
Devvit.addTrigger({
  event: 'PostSubmit',
  onEvent: async (event, context) => {
    const postEvent = event.post;
    if (!postEvent) return;

    try {
      const postDetail = await context.reddit.getPostById(postEvent.id);
      if (!postDetail) return;

      const { authorName, subredditName, body, url, title } = postDetail;

      let redditUser = null;
      try {
        redditUser = await context.reddit.getUserByUsername(authorName);
      } catch {
        console.warn(`Rate limit or fetch issue for user ${authorName}, using defaults`);
      }

      const karma = redditUser ? redditUser.linkKarma + redditUser.commentKarma : 0;
      const accountAgeDays = redditUser
        ? (Date.now() - redditUser.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      const post = {
        id: postDetail.id,
        author: authorName,
        subreddit: subredditName,
        title,
        body: body || '',
        url: url || '',
        timestamp: postDetail.createdAt?.getTime() ?? Date.now()
      };

      const user = {
        username: authorName,
        karma,
        accountAgeDays,
        riskScore: 0,
        lastSeen: Date.now()
      };

      await RedisSchema.savePost(context.redis, post);
      await RedisSchema.saveUser(context.redis, user);

      const [detection] = await Promise.all([
        detectSignals(context.redis, post, user)
      ]);

      user.riskScore = detection.riskScore;
      await RedisSchema.saveUser(context.redis, user);

      await Promise.all([
        processClusterDetection(context.redis, post, user),
      ]);

      const threshold = await context.settings.get('risk_threshold') as number | undefined ?? 70;

      if (detection.riskScore >= threshold) {
        const severity = detection.riskScore >= 85 ? 'High' : detection.riskScore >= 60 ? 'Medium' : 'Low';
        await RedisSchema.addAlert(context.redis, {
          id: `alert_${post.id}_${Date.now()}`,
          postId: post.id,
          username: post.author,
          severity: severity as 'High' | 'Medium' | 'Low',
          reason: detection.reasons[0] || 'Triggered heuristics',
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error('Error in Sentinel PostSubmit trigger:', e);
    }
  }
});

// 2. CONTEXT MENU ITEM: Analyze Network
Devvit.addMenuItem({
  label: 'Analyze Network (Sentinel)',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    const postId = event.targetId;
    
    try {
      context.ui.showToast('Sentinel: Analyzing network signals...');
      
      const [post, threshold] = await Promise.all([
        context.reddit.getPostById(postId),
        context.settings.get('risk_threshold') as Promise<number | undefined>
      ]);

      if (!post) {
        context.ui.showToast('Post not found.');
        return;
      }

      let redditUser = null;
      try {
        redditUser = await context.reddit.getUserByUsername(post.authorName);
      } catch {
        console.warn(`Could not fetch user data for ${post.authorName}`);
      }

      const karma = redditUser ? redditUser.linkKarma + redditUser.commentKarma : 0;
      const accountAgeDays = redditUser
        ? (Date.now() - redditUser.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      const mappedPost = {
        id: post.id,
        author: post.authorName,
        subreddit: post.subredditName,
        title: post.title,
        body: post.body || '',
        url: post.url || '',
        timestamp: Date.now()
      };

      const mappedUser = {
        username: post.authorName,
        karma,
        accountAgeDays,
        riskScore: 0,
        lastSeen: Date.now()
      };

      await Promise.all([
        RedisSchema.savePost(context.redis, mappedPost),
        RedisSchema.saveUser(context.redis, mappedUser)
      ]);

      const detection = await detectSignals(context.redis, mappedPost, mappedUser);
      
      mappedUser.riskScore = detection.riskScore;
      
      await Promise.all([
        RedisSchema.saveUser(context.redis, mappedUser),
        processClusterDetection(context.redis, mappedPost, mappedUser)
      ]);

      if (detection.riskScore >= (threshold ?? 70)) {
        const severity = detection.riskScore >= 85 ? 'High' : detection.riskScore >= 60 ? 'Medium' : 'Low';
        await RedisSchema.addAlert(context.redis, {
          id: `alert_${post.id}_${Date.now()}`,
          postId: post.id,
          username: post.authorName,
          severity: severity as 'High' | 'Medium' | 'Low',
          reason: detection.reasons[0] || 'Manual scan trigger',
          timestamp: Date.now()
        });
      }

      context.ui.showToast(`🛡️ Risk Score ${detection.riskScore}/100. ${detection.reasons[0] || 'No threats.'}`);
    } catch (e) {
      console.error('Error in manual scan:', e);
      context.ui.showToast(`Error: ${(e as Error).message}`);
    }
  }
});

// 3. SUBREDDIT MENU ITEM: Create Sentinel Dashboard
// Spawn a dashboard Custom Post in the current subreddit
Devvit.addMenuItem({
  label: 'Create Sentinel Dashboard',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    try {
      context.ui.showToast('Spawning Sentinel moderator dashboard...');
      
      const subreddit = await context.reddit.getCurrentSubreddit();
      const post = await context.reddit.submitPost({
        title: 'Sentinel Intelligence',
        subredditName: subreddit.name,
        preview: (
          <vstack height="100%" width="100%" alignment="middle center">
            <text size="large" weight="bold">Loading Sentinel...</text>
          </vstack>
        )
      });
      
      context.ui.navigateTo(post);
      context.ui.showToast('Sentinel Dashboard created successfully!');
    } catch (e) {
      console.error('Error creating Sentinel dashboard:', e);
      context.ui.showToast(`Failed to create dashboard: ${(e as Error).message}`);
    }
  }
});

// 4. REGISTER INTERACTIVE CUSTOM POST TYPE
Devvit.addCustomPostType({
  name: 'Sentinel Dashboard',
  render: AppHome
});

export default Devvit;
