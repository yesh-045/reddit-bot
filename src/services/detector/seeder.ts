import { RedisClient } from '@devvit/public-api';
import { RedisSchema } from '../../redis/schema.js';
import { RedditUser, RedditPost, CampaignCluster, AlertDetail } from '../../types/index.js';

async function saveUser(redis: RedisClient, u: RedditUser) { await RedisSchema.saveUser(redis, u); }
async function savePost(redis: RedisClient, p: RedditPost) {
  await RedisSchema.savePost(redis, p);
}
async function addAlert(redis: RedisClient, a: AlertDetail) { await RedisSchema.addAlert(redis, a); }
async function saveCluster(redis: RedisClient, c: CampaignCluster) { await RedisSchema.saveCluster(redis, c); }

const now = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function ts(ago: number) { return now - ago; }

const c1Users = ['giftguy1', 'giftguy2', 'freebies_here', 'giftcards_now', 'claimdeals', 'prizewinner'];
const c1Titles = [
  'Get your free $100 Amazon Gift Card now!',
  'FREE $100 Gift Card - Claim Today!',
  'Claim your 100 dollar giftcard instantly',
  'Legit free amazon gift card code 2026',
  'Who wants a free $100 giftcard? Grab it fast',
  'Free $100 Gift Cards are back, check this out',
];

const c2Users = ['cutekitten99', 'happyPuppy01', 'natureLover44', 'sunset_dreamer', 'chilledVibes8', 'fluffyTail', 'funnyPicsGo', 'memeMasterX'];
const c2Titles = [
  'Look at this cute puppy I found on my porch!',
  'Look at this cute puppy I found on my porch',
  'Look at this cute puppy found on my porch!',
  'look at this cute puppy I found on my porch!!',
];

const c3Users = ['gamerZone', 'epicClips', 'retroPlayer', 'pixelArt99', 'consoleWar', 'glitchFinder'];

const c4Users = ['crypto_moon1', 'eth_guru', 'btc_king2026', 'defi_alpha', 'nft_whale'];
const c4Titles = [
  'FREE ETH GIVEAWAY - 50000 ETH to the first 100 people!',
  'Double your BTC in 24 hours - verified working!',
  'Elon Musk confirmed airdrop - claim now',
  'New crypto token 1000x potential - act fast',
  'Free NFT mint - limited supply!',
];

const c5Users = ['reviewer_01', 'five_star_guy', 'top_rated_man', 'bestReviewEver', 'reviewSquad', 'verifiedBuyer', 'realUser_99'];
const c5Titles = [
  'This product changed my life! Must buy!',
  'I cannot believe how good this is - 5 stars',
  'Best purchase I have ever made on Amazon',
  'You NEED to try this product right now',
  'Unbelievable quality for the price',
  'I bought 3 more after trying the first one',
];

export async function seedDemoData(redis: RedisClient): Promise<void> {
  await RedisSchema.clearAllData(redis);

  const scamDomains = [
    'fastgiftz.xyz', 'claim-eth-giveaway.xyz', 'promo-deals.com',
    'cheap-gadgets.store', 'shady-link.xyz', 'btc-doubler.xyz',
    'vbucks-free.xyz', 'dealio.xyz', 'bossbabe.xyz',
    'discord-nitro-giveaway.xyz', 'nft-rare-mint.xyz', 'start-up.io',
    'content-farm-0.net', 'content-farm-1.net', 'content-farm-2.net',
    'amazon.com', 'youtube.com'
  ];
  for (const d of scamDomains) await RedisSchema.trackDomain(redis, d);

  const banned = ['ScammerX', 'SpamKing', 'BotsRUs', 'phisher_man', 'spam_merchant'];
  for (const b of banned) await RedisSchema.addBannedUsername(redis, b);

  // ══════════════════════════════════════════
  // CAMPAIGN 1: Affiliate Link Ring
  // 12 posts → gaming(3), deals(3), technology(3), funny(3)
  // ══════════════════════════════════════════
  await RedisSchema.trackDomain(redis, 'fastgiftz.xyz');
  await saveCluster(redis, {
    clusterId: 'cluster_domain_fastgiftz_xyz',
    members: c1Users,
    riskScore: 91,
    reason: ['Coordinated Domain Reuse: Same domain (fastgiftz.xyz) posted by 6 accounts.', 'Confidence is 91% based on account grouping size and domain correlation.', `6 unique accounts created within 48-hour window targeting 3 subreddits.`, `All posts contain identical affiliate link structure.`],
    sharedDomain: 'fastgiftz.xyz',
    confidence: 91,
    subreddits: ['gaming', 'deals', 'technology', 'funny'],
    breakdown: [{ label: 'Shared Domain Cluster', points: 40 }, { label: 'Cross-Subreddit Spread', points: 25 }, { label: 'Fresh Accounts', points: 15 }, { label: 'Velocity Signal', points: 11 }],
  });
  for (let i = 0; i < c1Users.length; i++) {
    await saveUser(redis, { username: c1Users[i], karma: 5 + i * 8, accountAgeDays: 2 + i * 3, riskScore: 85 + i, lastSeen: ts(i * 10 * MIN) });
  }
  const c1Subs = ['gaming', 'deals', 'technology', 'funny'];
  for (let i = 0; i < 12; i++) {
    await savePost(redis, { id: `t3_aff_${i}`, author: c1Users[i % c1Users.length], subreddit: c1Subs[i % 4], title: c1Titles[i % c1Titles.length], body: 'Go to fastgiftz.xyz to redeem your reward. Limited time offer only!', url: 'https://fastgiftz.xyz/redeem', timestamp: ts(i * 30 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 2: Karma Farming Ring
  // 20 posts → aww(6), memes(6), pics(4), funny(4)
  // ══════════════════════════════════════════
  await saveCluster(redis, {
    clusterId: 'cluster_karma_farming_ring',
    members: c2Users,
    riskScore: 84,
    reason: ['Karma Farming Group: 8 fresh accounts (<5 days old) crossposting near-identical content.', 'High similarity title patterns detected across 5 subreddits.', 'Title similarity scores range from 92% to 98% across all posts.', 'Accounts follow coordinated posting schedule within 20-minute windows.'],
    sharedTitlePattern: 'Look at this cute puppy I found on my porch!',
    confidence: 84,
    subreddits: ['aww', 'memes', 'pics', 'funny'],
    breakdown: [{ label: 'Title Similarity', points: 35 }, { label: 'Fresh Accounts', points: 20 }, { label: 'Cross-Subreddit Spread', points: 15 }, { label: 'Velocity Signal', points: 14 }],
  });
  for (let i = 0; i < c2Users.length; i++) {
    await saveUser(redis, { username: c2Users[i], karma: 2, accountAgeDays: 1.5, riskScore: 78, lastSeen: ts(i * 15 * MIN) });
  }
  const c2Subs = ['aww', 'aww', 'aww', 'memes', 'memes', 'memes', 'pics', 'pics', 'funny', 'funny',
                   'aww', 'aww', 'aww', 'memes', 'memes', 'memes', 'pics', 'pics', 'funny', 'funny'];
  for (let i = 0; i < 20; i++) {
    await savePost(redis, { id: `t3_karma_${i}`, author: c2Users[i % c2Users.length], subreddit: c2Subs[i], title: c2Titles[i % c2Titles.length], body: 'He was shivering so I brought him inside. What should I name him?', url: '', timestamp: ts(i * 20 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 3: Repost Ring
  // 18 posts → gaming(6), memes(6), pics(6)
  // ══════════════════════════════════════════
  await RedisSchema.trackDomain(redis, 'youtube.com');
  await saveCluster(redis, {
    clusterId: 'cluster_repost_gamer_ring',
    members: c3Users,
    riskScore: 88,
    reason: ['Coordinated Repost Ring: 6 accounts posting the exact same title within a 15-minute window.', 'High velocity schedule correlation.', 'All 6 accounts created within 24 hours of each other.', 'Exact title match across 18 posts in 2 gaming subreddits.'],
    sharedTitlePattern: 'This is hands down the best boss fight of 2026',
    confidence: 88,
    subreddits: ['gaming', 'memes', 'pics'],
    breakdown: [{ label: 'Exact Title Match', points: 40 }, { label: 'Fresh Accounts', points: 20 }, { label: 'Coordinated Timing', points: 18 }, { label: 'Cross-Subreddit Spread', points: 10 }],
  });
  for (let i = 0; i < c3Users.length; i++) {
    await saveUser(redis, { username: c3Users[i], karma: 15, accountAgeDays: 14, riskScore: 82, lastSeen: ts(i * 5 * MIN) });
  }
  const c3Subs = ['gaming', 'gaming', 'gaming', 'memes', 'memes', 'pics',
                   'gaming', 'gaming', 'gaming', 'memes', 'memes', 'pics',
                   'gaming', 'gaming', 'memes', 'memes', 'pics', 'pics'];
  for (let i = 0; i < 18; i++) {
    await savePost(redis, { id: `t3_repost_${i}`, author: c3Users[i % c3Users.length], subreddit: c3Subs[i], title: 'This is hands down the best boss fight of 2026', body: 'I still get goosebumps every time I play this level. Thoughts?', url: 'https://youtube.com/watch?v=mockgameboss', timestamp: ts(i * 5 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 4: Crypto Scam Ring
  // 10 posts → CryptoCurrency(5), NFT(5)
  // ══════════════════════════════════════════
  await RedisSchema.trackDomain(redis, 'claim-eth-giveaway.xyz');
  await saveCluster(redis, {
    clusterId: 'cluster_crypto_scam',
    members: c4Users,
    riskScore: 95,
    reason: ['Crypto Scam Ring: 5 accounts promoting fake giveaways across crypto subreddits.', 'All use the same ETH wallet address in post bodies.', 'Domain claim-eth-giveaway.xyz registered 2 days before first post.', 'Classic giveaway scam pattern: promise 10x returns on ETH sent.'],
    sharedDomain: 'claim-eth-giveaway.xyz',
    confidence: 95,
    subreddits: ['CryptoCurrency', 'NFT'],
    breakdown: [{ label: 'Shared Domain Cluster', points: 40 }, { label: 'Fresh Accounts', points: 25 }, { label: 'Scam Domain Pattern', points: 20 }, { label: 'High Velocity', points: 10 }],
  });
  for (let i = 0; i < c4Users.length; i++) {
    await saveUser(redis, { username: c4Users[i], karma: i * 3, accountAgeDays: i + 1, riskScore: 90 + i, lastSeen: ts(i * 8 * MIN) });
  }
  for (let i = 0; i < 10; i++) {
    await savePost(redis, { id: `t3_crypto_${i}`, author: c4Users[i % c4Users.length], subreddit: i < 5 ? 'CryptoCurrency' : 'NFT', title: c4Titles[i % c4Titles.length], body: 'Send 0.1 ETH to 0xMockWalletAddress to receive 10x back! Visit claim-eth-giveaway.xyz for proof.', url: 'https://claim-eth-giveaway.xyz', timestamp: ts(i * 15 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 5: Review Manipulation
  // 14 posts → productivity(5), technology(5), deals(4)
  // ══════════════════════════════════════════
  await RedisSchema.trackDomain(redis, 'amazon.com');
  await saveCluster(redis, {
    clusterId: 'cluster_review_ring',
    members: c5Users,
    riskScore: 87,
    reason: ['Review Manipulation Ring: 7 accounts posting identical 5-star review language across product subreddits.', 'All accounts created within the same 48-hour window.', 'All 7 accounts use the same affiliate link structure.', 'Review language is 90%+ similar across all posts.'],
    sharedTitlePattern: 'This product changed my life! Must buy!',
    confidence: 87,
    subreddits: ['productivity', 'technology', 'deals'],
    breakdown: [{ label: 'Affiliate Link Reuse', points: 35 }, { label: 'Cross-Subreddit Spread', points: 25 }, { label: 'Fresh Accounts', points: 17 }, { label: 'Title Similarity', points: 10 }],
  });
  for (let i = 0; i < c5Users.length; i++) {
    await saveUser(redis, { username: c5Users[i], karma: 10 + i * 5, accountAgeDays: 3, riskScore: 80 + i, lastSeen: ts(i * 12 * MIN) });
  }
  for (let i = 0; i < 14; i++) {
    const sub = i < 5 ? 'productivity' : i < 10 ? 'technology' : 'deals';
    await savePost(redis, { id: `t3_review_${i}`, author: c5Users[i % c5Users.length], subreddit: sub, title: c5Titles[i % c5Titles.length], body: 'Absolutely love this product! Shipping was fast and the quality is unmatched. 10/10 would recommend to everyone.', url: 'https://amazon.com/dp/mockproduct', timestamp: ts(i * 25 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 6: NFT Scam Ring
  // 24 posts → NFT(8), CryptoCurrency(8), Art(4), Music(4)
  // ══════════════════════════════════════════
  const c6Users = ['nft_mint_pro', 'rare_drop_alert', 'nft_alpha_insider', 'mint_bot_xyz', 'nft_early_access', 'crypto_art_promoter'];
  const c6Domains = ['nft-rare-mint.xyz', 'mint-pass.xyz', 'nft-drops.io'];
  const c6Titles = [
    'URGENT: Rare NFT drop - minting in 2 hours!',
    'Exclusive NFT mint pass - limited supply!',
    'Free NFT mint for first 100 wallets!',
    'NFT whitelist spots available - DM me!',
    'RARE 10K PFP PROJECT - MINT NOW',
    'Presale access for new NFT collection',
  ];
  for (const d of c6Domains) await RedisSchema.trackDomain(redis, d);
  await saveCluster(redis, {
    clusterId: 'cluster_nft_scam_ring',
    members: c6Users,
    riskScore: 93,
    reason: ['NFT Scam Ring: 6 accounts promoting fake NFT mints across 4 crypto/NFT subreddits.', 'All accounts reference the same 3 minting domains (nft-rare-mint.xyz, mint-pass.xyz, nft-drops.io).', 'Accounts created within 72-hour window, all less than 5 days old.', 'Typical rug-pull pattern: urgency tactics, limited supply claims, whitelist FOMO.'],
    sharedDomain: 'nft-rare-mint.xyz',
    confidence: 93,
    subreddits: ['NFT', 'CryptoCurrency', 'Art', 'Music'],
    breakdown: [{ label: 'Shared Domain Cluster', points: 40 }, { label: 'Cross-Subreddit Spread', points: 25 }, { label: 'Fresh Accounts', points: 18 }, { label: 'Scam Language Pattern', points: 10 }],
  });
  for (let i = 0; i < c6Users.length; i++) {
    await saveUser(redis, { username: c6Users[i], karma: i * 5, accountAgeDays: 2 + i * 0.5, riskScore: 85 + i, lastSeen: ts(i * 10 * MIN) });
  }
  const c6Subs = ['NFT', 'NFT', 'CryptoCurrency', 'CryptoCurrency', 'Art', 'Music',
                   'NFT', 'NFT', 'CryptoCurrency', 'CryptoCurrency', 'Art', 'Music',
                   'NFT', 'NFT', 'CryptoCurrency', 'CryptoCurrency', 'Art', 'Music',
                   'NFT', 'NFT', 'CryptoCurrency', 'CryptoCurrency', 'Art', 'Music'];
  for (let i = 0; i < 24; i++) {
    await savePost(redis, { id: `t3_nftscam_${i}`, author: c6Users[i % c6Users.length], subreddit: c6Subs[i], title: c6Titles[i % c6Titles.length], body: `Mint at ${c6Domains[i % c6Domains.length]} - 0.5 ETH each, 10K supply, RARE project!`, url: `https://${c6Domains[i % c6Domains.length]}/mint`, timestamp: ts(i * 8 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 7: Crypto Pump Group
  // 32 posts → CryptoCurrency(10), SatoshiStreetBets(10), StockMarket(6), NFT(6)
  // ══════════════════════════════════════════
  const c7Users = ['pump_king_01', 'altcoin_signal', 'moon_boi_99', 'crypto_whale_alert', 'token_guru', 'defi_pumper', 'shitcoin_expert', 'meme_token_lord'];
  const c7Titles = [
    'PAMP IT!!! $SHITCOIN TO THE MOON!!!',
    'HUGE PUMP incoming for $BONK token!',
    'Signal: $PEPE mega pump at 3PM UTC!',
    'Dont miss the $WOOF pump tonight!',
    '$DOGE2 PUMP GROUP - JOIN NOW',
    'Coordinated buy wall at 2PM for $XYZ',
    '$MOON token launching on DEX - 100x potential',
    'INSIDER ALERT: $SHIB breakout incoming',
  ];
  await saveCluster(redis, {
    clusterId: 'cluster_crypto_pump',
    members: c7Users,
    riskScore: 90,
    reason: ['Crypto Pump Group: 8 accounts coordinating pump-and-dump signals across 5 crypto subreddits.', 'Near-identical timing: all posts within 5-minute windows at specific times.', 'All accounts reference the same Telegram/Discord pump group.', 'ChatGPT-detected coordinated language pattern: urgent, all-caps, rocket emojis.'],
    sharedTitlePattern: 'PUMP incoming for',
    confidence: 90,
    subreddits: ['CryptoCurrency', 'SatoshiStreetBets', 'StockMarket', 'NFT'],
    breakdown: [{ label: 'Coordinated Timing', points: 35 }, { label: 'Cross-Subreddit Spread', points: 25 }, { label: 'Fresh Accounts', points: 20 }, { label: 'Title Similarity', points: 10 }],
  });
  for (let i = 0; i < c7Users.length; i++) {
    await saveUser(redis, { username: c7Users[i], karma: 20 + i * 10, accountAgeDays: 10 + i * 3, riskScore: 80 + i, lastSeen: ts(i * 6 * MIN) });
  }
  const c7Subs = ['CryptoCurrency', 'CryptoCurrency', 'SatoshiStreetBets', 'SatoshiStreetBets', 'StockMarket', 'NFT',
                   'CryptoCurrency', 'CryptoCurrency', 'SatoshiStreetBets', 'SatoshiStreetBets', 'StockMarket', 'NFT',
                   'CryptoCurrency', 'CryptoCurrency', 'SatoshiStreetBets', 'SatoshiStreetBets', 'StockMarket', 'NFT',
                   'CryptoCurrency', 'CryptoCurrency', 'SatoshiStreetBets', 'SatoshiStreetBets', 'StockMarket', 'NFT',
                   'CryptoCurrency', 'CryptoCurrency', 'SatoshiStreetBets', 'SatoshiStreetBets', 'StockMarket', 'NFT'];
  for (let i = 0; i < 30; i++) {
    await savePost(redis, { id: `t3_pump_${i}`, author: c7Users[i % c7Users.length], subreddit: c7Subs[i], title: c7Titles[i % c7Titles.length], body: 'Join our pump group on Telegram! Links in bio. Next pump at 3PM UTC! Do not miss out!', url: '', timestamp: ts(i * 4 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 8: AI Tool Promotion
  // 28 posts → technology(8), productivity(6), gaming(4), Music(4), Art(3), funny(3)
  // ══════════════════════════════════════════
  const c8Users = ['ai_tool_finder', 'gpt_master_2026', 'ai_news_promoter', 'neural_hacks', 'ai_writer_pro', 'ml_tips_daily', 'prompt_engineer_pro'];
  const c8Domains = ['ai-tool-hub.co', 'gpt-prompts.io', 'neural-boost.com'];
  const c8Titles = [
    'This AI tool writes better than humans - try it!',
    '10x your productivity with this GPT prompt',
    'New AI model released - benchmarks are insane!',
    'I found the best AI writing tool, check it out',
    'This free AI tool saved me 20 hours a week',
    'Game changer: new AI image generator is insane',
    'You NEED this AI tool in your workflow',
  ];
  for (const d of c8Domains) await RedisSchema.trackDomain(redis, d);
  await saveCluster(redis, {
    clusterId: 'cluster_ai_tool_ring',
    members: c8Users,
    riskScore: 86,
    reason: ['AI Tool Promotion Cluster: 7 accounts promoting the same 3 AI tool domains across 6 subreddits.', 'All accounts use the same affiliate referral links.', 'Accounts follow identical posting schedule: one post every 4 hours.', 'Promotional language is 85%+ similar across all accounts.'],
    sharedDomain: 'ai-tool-hub.co',
    confidence: 86,
    subreddits: ['technology', 'productivity', 'gaming', 'Music', 'Art', 'funny'],
    breakdown: [{ label: 'Affiliate Link Reuse', points: 35 }, { label: 'Cross-Subreddit Spread', points: 25 }, { label: 'Fresh Accounts', points: 16 }, { label: 'Promotional Pattern', points: 10 }],
  });
  for (let i = 0; i < c8Users.length; i++) {
    await saveUser(redis, { username: c8Users[i], karma: 50 + i * 15, accountAgeDays: 20 + i * 5, riskScore: 75 + i, lastSeen: ts(i * 8 * MIN) });
  }
  const c8Subs = ['technology', 'technology', 'productivity', 'productivity', 'gaming', 'Music',
                   'technology', 'technology', 'productivity', 'productivity', 'gaming', 'Art',
                   'technology', 'technology', 'productivity', 'productivity', 'Art', 'funny',
                   'technology', 'technology', 'gaming', 'gaming', 'funny', 'funny',
                   'technology', 'Music', 'Music', 'Music'];
  for (let i = 0; i < 28; i++) {
    await savePost(redis, { id: `t3_ai_${i}`, author: c8Users[i % c8Users.length], subreddit: c8Subs[i], title: c8Titles[i % c8Titles.length], body: `Check out ${c8Domains[i % c8Domains.length]} for the full guide! Affiliate link inside.`, url: `https://${c8Domains[i % c8Domains.length]}/ref=promo`, timestamp: ts(i * 12 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 9: Affiliate Spam Network
  // 40 posts → deals(8), gaming(6), technology(6), funny(6), aww(4), pics(4), shopping(3), gadgets(3)
  // ══════════════════════════════════════════
  const c9Users = ['best_deals_ever', 'savings_queen', 'deal_hunter_pro', 'coupon_master_99', 'discount_finder_io', 'cashback_king', 'promo_code_guru', 'voucher_whiz', 'rebate_expert', 'price_tracker_pro'];
  const c9Domains = ['best-deals-today.co', 'savings-hub.io', 'coupon-king.net'];
  const c9Titles = [
    'Huge sale on Amazon today - up to 80% off!',
    'Exclusive coupon code - save $50 instantly!',
    'Best Black Friday deals already live!',
    'Secret discount page - 90% off everything',
    'Price drop alert on top electronics!',
    'Flash sale: 24 hours only, use code SAVE20',
    'I found the cheapest prices for these items',
    'Limited time offer - buy one get one free!',
    'Price comparison: this site is always cheapest',
    'Don\'t buy before checking this deal!',
  ];
  for (const d of c9Domains) await RedisSchema.trackDomain(redis, d);
  await saveCluster(redis, {
    clusterId: 'cluster_affiliate_spam',
    members: c9Users,
    riskScore: 94,
    reason: ['Affiliate Spam Network: 10 accounts promoting 3 deal/coupon domains with identical affiliate links.', 'Massive cross-subreddit spread: 8 subreddits targeted with same deals.', 'Accounts created in 3 batches: 5 accounts on day 1, 3 on day 3, 2 on day 5.', '95%+ title similarity across deal subreddits.'],
    sharedDomain: 'best-deals-today.co',
    confidence: 94,
    subreddits: ['deals', 'gaming', 'technology', 'funny', 'aww', 'pics', 'shopping', 'gadgets'],
    breakdown: [{ label: 'Shared Domain Cluster', points: 40 }, { label: 'Cross-Subreddit Spread', points: 25 }, { label: 'Fresh Accounts', points: 19 }, { label: 'Title Pattern', points: 10 }],
  });
  for (let i = 0; i < c9Users.length; i++) {
    await saveUser(redis, { username: c9Users[i], karma: 100 + i * 20, accountAgeDays: 30 + i * 2, riskScore: 85 + i, lastSeen: ts(i * 5 * MIN) });
  }
  const c9Subs = ['deals', 'deals', 'gaming', 'gaming', 'technology', 'funny', 'aww', 'pics',
                   'deals', 'deals', 'gaming', 'gaming', 'technology', 'funny', 'aww', 'pics',
                   'deals', 'deals', 'gaming', 'gaming', 'technology', 'funny', 'shopping', 'gadgets',
                   'deals', 'deals', 'technology', 'technology', 'funny', 'funny', 'shopping', 'gadgets',
                   'deals', 'deals', 'technology', 'technology', 'funny', 'aww', 'shopping', 'gadgets'];
  for (let i = 0; i < 40; i++) {
    await savePost(redis, { id: `t3_deal_${i}`, author: c9Users[i % c9Users.length], subreddit: c9Subs[i], title: c9Titles[i % c9Titles.length], body: `Best price guaranteed at ${c9Domains[i % c9Domains.length]}! Use code SENTINEL for extra 10% off!`, url: `https://${c9Domains[i % c9Domains.length]}/ref=affiliate${i}`, timestamp: ts(i * 15 * MIN) });
  }

  // ══════════════════════════════════════════
  // CAMPAIGN 10: Karma Farming Cluster v2
  // 30 posts → memes(6), gaming(6), pics(6), funny(6), aww(3), Art(3)
  // ══════════════════════════════════════════
  const c10Users = ['upvote_me_plz', 'karma_seeker_22', 'need_karma_fast', 'upvote_swap_pro', 'karma_boost_99', 'karma_farm_bot', 'like_for_like_00', 'karma_trader_88', 'vote_up_party', 'karma_grinder'];
  const c10Titles = [
    'Just joined Reddit, hi everyone!',
    'Can I get some karma please?',
    'Upvote this and I\'ll upvote your post!',
    'New here, upvote for visibility!',
    'Let\'s help each other get karma!',
    'Comment your post and I\'ll upvote it!',
    'Karma 4 karma - upvote this thread!',
    'Need 100 karma to post in my favorite sub',
    'Upvoting everyone in this thread!',
    'Free karma train - CHOO CHOO!',
  ];
  await saveCluster(redis, {
    clusterId: 'cluster_karma_farm_v2',
    members: c10Users,
    riskScore: 82,
    reason: ['Karma Farming Cluster: 10 accounts soliciting upvotes across 5 meta/karma subreddits.', 'All accounts less than 24 hours old.', 'Identical posting patterns: post, wait 5 minutes, delete, repost.', 'Accounts exhibit vote manipulation: coordinated upvote rings detected.'],
    sharedTitlePattern: 'Upvote this and I\'ll upvote your post!',
    confidence: 82,
    subreddits: ['memes', 'gaming', 'pics', 'funny', 'aww', 'Art'],
    breakdown: [{ label: 'Vote Manipulation', points: 30 }, { label: 'Cross-Subreddit Spread', points: 20 }, { label: 'Fresh Accounts', points: 18 }, { label: 'High Velocity', points: 14 }],
  });
  for (let i = 0; i < c10Users.length; i++) {
    await saveUser(redis, { username: c10Users[i], karma: 0, accountAgeDays: 0.5 + i * 0.1, riskScore: 70 + i, lastSeen: ts(i * 3 * MIN) });
  }
  const c10Subs = ['memes', 'memes', 'gaming', 'gaming', 'pics', 'funny',
                    'memes', 'memes', 'gaming', 'gaming', 'pics', 'funny',
                    'memes', 'memes', 'gaming', 'gaming', 'pics', 'funny',
                    'aww', 'aww', 'aww', 'Art', 'Art', 'Art',
                    'pics', 'pics', 'funny', 'funny', 'memes', 'memes'];
  for (let i = 0; i < 30; i++) {
    await savePost(redis, { id: `t3_kfarm_${i}`, author: c10Users[i % c10Users.length], subreddit: c10Subs[i], title: c10Titles[i % c10Titles.length], body: 'Upvote for upvote! Drop your link in comments.', url: '', timestamp: ts(i * 2 * MIN) });
  }

  // ══════════════════════════════════════════
  // INDIVIDUAL HIGH-RISK USERS & ALERTS
  // ══════════════════════════════════════════

  // Alert #1: user123 → funny(1), shopping(5)
  await saveUser(redis, { username: 'user123', karma: 12, accountAgeDays: 4, riskScore: 92, lastSeen: ts(5 * MIN) });
  await savePost(redis, { id: 't3_user123_post', author: 'user123', subreddit: 'funny', title: 'Check out this awesome new tech discount!', body: 'Found this great discount on promo-deals.com', url: 'https://promo-deals.com/discount', timestamp: ts(5 * MIN) });
  for (let s = 1; s <= 5; s++) {
    await savePost(redis, { id: `t3_user123_extra_${s}`, author: `promo_bot_${s}`, subreddit: 'shopping', title: `Awesome deal on tech items ${s}`, body: 'Get it at promo-deals.com', url: 'https://promo-deals.com/discount', timestamp: ts(s * 30 * MIN) });
  }
  await addAlert(redis, { id: 'alert_user123', postId: 't3_user123_post', username: 'user123', severity: 'High', reason: 'Posted same domain across 6 subreddits', timestamp: ts(5 * MIN) });

  // Alert #2: user456 → pics(6), funny(5), aww(4)
  await saveUser(redis, { username: 'user456', karma: 1, accountAgeDays: 2, riskScore: 78, lastSeen: ts(15 * MIN) });
  await savePost(redis, { id: 't3_user456_post', author: 'user456', subreddit: 'pics', title: 'Amazing view from my window this morning!', body: 'Spent 20 minutes capturing this', url: '', timestamp: ts(15 * MIN) });
  const a2Subs = ['pics', 'pics', 'pics', 'funny', 'funny', 'aww',
                   'pics', 'pics', 'pics', 'funny', 'funny', 'aww',
                   'funny', 'aww', 'aww'];
  for (let p = 1; p <= 14; p++) {
    await savePost(redis, { id: `t3_user456_velocity_${p}`, author: 'user456', subreddit: a2Subs[p-1], title: `Look at this picture ${p}`, body: 'Nice view', url: '', timestamp: ts(p * MIN) });
  }
  await addAlert(redis, { id: 'alert_user456', postId: 't3_user456_post', username: 'user456', severity: 'Medium', reason: 'Posted 15 times in 30 minutes (velocity spam)', timestamp: ts(15 * MIN) });

  // Alert #3: user789 → gaming(2)
  await saveUser(redis, { username: 'user789', karma: 150, accountAgeDays: 60, riskScore: 45, lastSeen: ts(45 * MIN) });
  await savePost(redis, { id: 't3_retro_orig', author: 'retroGamer', subreddit: 'gaming', title: 'Who else remembers this hidden gem console?', body: 'Best console of the early 2000s.', url: '', timestamp: ts(2 * HOUR) });
  await savePost(redis, { id: 't3_user789_post', author: 'user789', subreddit: 'gaming', title: 'Who else remembers this hidden gem console?', body: 'I still have mine in the attic.', url: '', timestamp: ts(45 * MIN) });
  await addAlert(redis, { id: 'alert_user789', postId: 't3_user789_post', username: 'user789', severity: 'Low', reason: 'Exact duplicate title detected', timestamp: ts(45 * MIN) });

  // Alert #4: shady_dealer → techsupport(1), gadgets(4)
  await saveUser(redis, { username: 'shady_dealer', karma: 0, accountAgeDays: 0.5, riskScore: 95, lastSeen: ts(10 * MIN) });
  await savePost(redis, { id: 't3_shady1', author: 'shady_dealer', subreddit: 'techsupport', title: 'Cheap iPhones for sale! Unbeatable prices!', body: 'All models available at cheap-gadgets.store', url: 'https://cheap-gadgets.store', timestamp: ts(10 * MIN) });
  for (let s = 1; s <= 4; s++) {
    await savePost(redis, { id: `t3_shady_extra_${s}`, author: 'shady_dealer', subreddit: 'gadgets', title: `iPhone deal ${s}`, body: 'cheap-gadgets.store', url: 'https://cheap-gadgets.store', timestamp: ts((s + 1) * 10 * MIN) });
  }
  await addAlert(redis, { id: 'alert_shady', postId: 't3_shady1', username: 'shady_dealer', severity: 'Critical', reason: 'Fresh account (<1d) spamming same domain across 5 subreddits', timestamp: ts(10 * MIN) });

  // Alert #5: banEvader_99 → spam(1)
  await saveUser(redis, { username: 'banEvader_99', karma: 8, accountAgeDays: 1, riskScore: 88, lastSeen: ts(20 * MIN) });
  await savePost(redis, { id: 't3_banevader', author: 'banEvader_99', subreddit: 'spam', title: 'Check out my new channel!', body: 'Link in bio', url: 'https://shady-link.xyz', timestamp: ts(20 * MIN) });
  await addAlert(redis, { id: 'alert_banevader', postId: 't3_banevader', username: 'banEvader_99', severity: 'High', reason: 'Username 87% similar to banned user "SpamKing"', timestamp: ts(20 * MIN) });

  // Alert #6: crypto_bro_22 → CryptoCurrency(1)
  await saveUser(redis, { username: 'crypto_bro_22', karma: 5, accountAgeDays: 3, riskScore: 85, lastSeen: ts(30 * MIN) });
  await savePost(redis, { id: 't3_crypto_bro', author: 'crypto_bro_22', subreddit: 'CryptoCurrency', title: 'URGENT: Double your BTC in 24 hours!', body: 'Trusted platform: btc-doubler.xyz', url: 'https://btc-doubler.xyz', timestamp: ts(30 * MIN) });
  await addAlert(redis, { id: 'alert_crypto_bro', postId: 't3_crypto_bro', username: 'crypto_bro_22', severity: 'High', reason: 'Crypto scam domain with fresh account', timestamp: ts(30 * MIN) });

  // Alert #7: spammy_mcspamface → gaming(1)
  await saveUser(redis, { username: 'spammy_mcspamface', karma: 35, accountAgeDays: 10, riskScore: 76, lastSeen: ts(40 * MIN) });
  await savePost(redis, { id: 't3_spammy1', author: 'spammy_mcspamface', subreddit: 'gaming', title: 'FREE V-BUCKS GENERATOR 2026', body: 'Get free v-bucks at vbucks-free.xyz', url: 'https://vbucks-free.xyz', timestamp: ts(40 * MIN) });
  await addAlert(redis, { id: 'alert_spammy', postId: 't3_spammy1', username: 'spammy_mcspamface', severity: 'Medium', reason: 'Promoting scam website across multiple subreddits', timestamp: ts(40 * MIN) });

  // Alert #8: fresh_alt_99 → spam(5)
  await saveUser(redis, { username: 'fresh_alt_99', karma: 0, accountAgeDays: 0.1, riskScore: 82, lastSeen: ts(55 * MIN) });
  await savePost(redis, { id: 't3_fresh_alt', author: 'fresh_alt_99', subreddit: 'all', title: 'Upvote this post please!', body: 'Need karma to post in other subreddits', url: '', timestamp: ts(55 * MIN) });
  for (let p = 1; p <= 4; p++) {
    await savePost(redis, { id: `t3_fresh_alt_${p}`, author: 'fresh_alt_99', subreddit: 'spam', title: `Please upvote ${p}`, body: 'Karma please', url: '', timestamp: ts((55 - p * 2) * MIN) });
  }
  await addAlert(redis, { id: 'alert_fresh_alt', postId: 't3_fresh_alt', username: 'fresh_alt_99', severity: 'High', reason: 'Account < 3 hours old with high posting velocity', timestamp: ts(55 * MIN) });

  // Alert #9: deal_finder_42 → deals(1)
  await saveUser(redis, { username: 'deal_finder_42', karma: 50, accountAgeDays: 15, riskScore: 71, lastSeen: ts(HOUR) });
  await savePost(redis, { id: 't3_deal_finder', author: 'deal_finder_42', subreddit: 'deals', title: 'Huge discount on electronics!', body: 'Check out dealio.xyz for amazing prices', url: 'https://dealio.xyz', timestamp: ts(HOUR) });
  await addAlert(redis, { id: 'alert_deal_finder', postId: 't3_deal_finder', username: 'deal_finder_42', severity: 'Medium', reason: 'Repeated domain posting across subreddits', timestamp: ts(HOUR) });

  // Alert #10: reposter_bot_01 → memes(2)
  await saveUser(redis, { username: 'reposter_bot_01', karma: 200, accountAgeDays: 90, riskScore: 52, lastSeen: ts(2 * HOUR) });
  await savePost(redis, { id: 't3_orig_meme', author: 'original_creator', subreddit: 'memes', title: 'This meme is way too accurate', body: 'OC', url: '', timestamp: ts(3 * HOUR) });
  await savePost(redis, { id: 't3_repost_bot', author: 'reposter_bot_01', subreddit: 'memes', title: 'This meme is way too accurate', body: 'Found this somewhere', url: '', timestamp: ts(2 * HOUR) });
  await addAlert(redis, { id: 'alert_repost_bot', postId: 't3_repost_bot', username: 'reposter_bot_01', severity: 'Low', reason: 'Reposted exact meme title within 1 hour', timestamp: ts(2 * HOUR) });

  // Alert #11: mlm_pusher → workonline(1)
  await saveUser(redis, { username: 'mlm_pusher', karma: 20, accountAgeDays: 7, riskScore: 79, lastSeen: ts(90 * MIN) });
  await savePost(redis, { id: 't3_mlm1', author: 'mlm_pusher', subreddit: 'workonline', title: 'Make $10,000/month working from home!', body: 'Join my downline at bossbabe.xyz and start earning today!', url: 'https://bossbabe.xyz/join', timestamp: ts(90 * MIN) });
  await addAlert(redis, { id: 'alert_mlm', postId: 't3_mlm1', username: 'mlm_pusher', severity: 'Medium', reason: 'MLM/pyramid scheme domain with suspicious account', timestamp: ts(90 * MIN) });

  // Alert #12: vote_manip_01 → politics(1)
  await saveUser(redis, { username: 'vote_manip_01', karma: 3, accountAgeDays: 0.5, riskScore: 83, lastSeen: ts(70 * MIN) });
  await savePost(redis, { id: 't3_vote_manip', author: 'vote_manip_01', subreddit: 'politics', title: 'Upvote for visibility - important message!', body: 'This needs to be seen by everyone', url: '', timestamp: ts(70 * MIN) });
  await addAlert(redis, { id: 'alert_vote_manip', postId: 't3_vote_manip', username: 'vote_manip_01', severity: 'High', reason: 'New account soliciting upvotes across subreddits', timestamp: ts(70 * MIN) });

  // Alert #13: phish_hook → discordapp(1)
  await saveUser(redis, { username: 'phish_hook', karma: 10, accountAgeDays: 5, riskScore: 90, lastSeen: ts(25 * MIN) });
  await savePost(redis, { id: 't3_phish1', author: 'phish_hook', subreddit: 'discordapp', title: 'Free Discord Nitro - limited time only!', body: 'Claim at discord-nitro-giveaway.xyz and login with your Discord credentials', url: 'https://discord-nitro-giveaway.xyz', timestamp: ts(25 * MIN) });
  await addAlert(redis, { id: 'alert_phish', postId: 't3_phish1', username: 'phish_hook', severity: 'Critical', reason: 'Phishing domain targeting Discord users', timestamp: ts(25 * MIN) });

  // Alert #14: bot_army_01 → politics(1)
  await saveUser(redis, { username: 'bot_army_01', karma: 2, accountAgeDays: 1, riskScore: 86, lastSeen: ts(35 * MIN) });
  await savePost(redis, { id: 't3_bot_army', author: 'bot_army_01', subreddit: 'politics', title: 'This candidate is the ONLY choice', body: 'Share this message everywhere', url: '', timestamp: ts(35 * MIN) });
  await addAlert(redis, { id: 'alert_bot_army', postId: 't3_bot_army', username: 'bot_army_01', severity: 'High', reason: 'Suspected bot account in coordinated political campaign', timestamp: ts(35 * MIN) });

  // Alert #15: nft_scam_2026 → NFT(1)
  await saveUser(redis, { username: 'nft_scam_2026', karma: 25, accountAgeDays: 6, riskScore: 80, lastSeen: ts(50 * MIN) });
  await savePost(redis, { id: 't3_nft_scam', author: 'nft_scam_2026', subreddit: 'NFT', title: 'RARE NFT DROP - MINT BEFORE THEY ARE GONE!', body: 'Mint here: nft-rare-mint.xyz - 0.5 ETH each, limited to 1000', url: 'https://nft-rare-mint.xyz', timestamp: ts(50 * MIN) });
  await addAlert(redis, { id: 'alert_nft_scam', postId: 't3_nft_scam', username: 'nft_scam_2026', severity: 'High', reason: 'Suspicious NFT minting website with new account', timestamp: ts(50 * MIN) });

  // Alert #16: astroturf_01 → startups(1), workonline(1)
  await saveUser(redis, { username: 'astroturf_01', karma: 100, accountAgeDays: 20, riskScore: 65, lastSeen: ts(3 * HOUR) });
  await savePost(redis, { id: 't3_astroturf', author: 'astroturf_01', subreddit: 'startups', title: 'This new startup is absolutely revolutionary!', body: 'Been using it for a week and it changed everything. Check out start-up.io', url: 'https://start-up.io', timestamp: ts(3 * HOUR) });
  await addAlert(redis, { id: 'alert_astroturf', postId: 't3_astroturf', username: 'astroturf_01', severity: 'Medium', reason: 'Astroturfing: suspicious promotional content across review subreddits', timestamp: ts(3 * HOUR) });

  // Alert #17: link_farmer_001 → startups(10)
  await saveUser(redis, { username: 'link_farmer_001', karma: 45, accountAgeDays: 12, riskScore: 74, lastSeen: ts(110 * MIN) });
  for (let p = 0; p < 10; p++) {
    await savePost(redis, { id: `t3_linkfarm_${p}`, author: 'link_farmer_001', subreddit: 'startups', title: `Check out this cool site ${p + 1}`, body: 'Found this awesome website with great content', url: `https://content-farm-${p % 3}.net/article${p}`, timestamp: ts((110 - p * 5) * MIN) });
  }
  await addAlert(redis, { id: 'alert_link_farmer', postId: 't3_linkfarm_0', username: 'link_farmer_001', severity: 'High', reason: 'Link farming: 10 posts across 5 subreddits promoting content farms', timestamp: ts(110 * MIN) });

  // ══════════════════════════════════════════
  // RECENTLY SEARCHED USERS
  // ══════════════════════════════════════════
  const recentUsers = [
    'user123', 'user456', 'user789', 'shady_dealer', 'banEvader_99',
    'crypto_bro_22', 'spammy_mcspamface', 'fresh_alt_99', 'deal_finder_42',
    'reposter_bot_01', 'mlm_pusher', 'vote_manip_01', 'phish_hook',
    'bot_army_01', 'nft_scam_2026', 'astroturf_01', 'link_farmer_001',
    'giftguy1', 'cutekitten99', 'gamerZone', 'crypto_moon1', 'reviewer_01',
    'nft_mint_pro', 'pump_king_01', 'ai_tool_finder', 'best_deals_ever', 'upvote_me_plz',
    'rare_drop_alert', 'moon_boi_99', 'gpt_master_2026', 'savings_queen', 'karma_seeker_22',
  ];
  for (const u of recentUsers) {
    await RedisSchema.addRecentUser(redis, u);
  }
}

export interface DemoDatasetStats {
  campaigns: number;
  accounts: number;
  posts: number;
  subreddits: number;
  domains: number;
}

// ══════════════════════════════════════════
// DETERMINISTIC DEMO: Operation FastGiftz
// ══════════════════════════════════════════
export async function seedDemoDataset(redis: RedisClient): Promise<DemoDatasetStats> {
  await RedisSchema.clearAllData(redis);

  const DOMAIN = 'fastgiftz.xyz';
  const USERS = ['giftguy1', 'giftguy2', 'freebies_here', 'giftcards_now', 'claimdeals', 'prizewinner'];
  const TITLES = [
    'Get your free $100 Amazon Gift Card now!',
    'FREE $100 Gift Card - Claim Today!',
    'Claim your 100 dollar giftcard instantly',
    'Legit free amazon gift card code 2026',
    'Who wants a free $100 giftcard? Grab it fast',
    'Free $100 Gift Cards are back, check this out',
  ];
  const BODIES = [
    'Go to fastgiftz.xyz to claim your $100 gift card. Limited time offer!',
    'Hurry! Only 50 gift cards left at fastgiftz.xyz. Grab yours now!',
    'I just got my $100 card from fastgiftz.xyz. It actually works!',
    'fastgiftz.xyz is giving away $100 Amazon cards. Get yours fast!',
  ];

  // Deterministic post distribution per subreddit (pyramid shape)
  const POSTS_PER_SUBREDDIT: [string, number][] = [
    ['gaming', 18],
    ['deals', 10],
    ['technology', 8],
    ['freebies', 6],
    ['funny', 6],
    ['aww', 4],
    ['pics', 4],
    ['shopping', 3],
    ['memes', 3],
    ['CryptoCurrency', 3],
    ['NFT', 2],
    ['music', 2],
    ['Art', 2],
    ['gadgets', 2],
    ['videos', 2],
  ];

  const now = Date.now();
  const MIN = 60 * 1000;

  function ts(ago: number) { return now - ago; }

  // Track domain
  await RedisSchema.trackDomain(redis, DOMAIN);

  // Create accounts with deterministic ages and karma
  const accountData = [
    { username: 'giftguy1', karma: 5, ageDays: 0.5, risk: 91 },
    { username: 'giftguy2', karma: 12, ageDays: 1.5, risk: 87 },
    { username: 'freebies_here', karma: 8, ageDays: 0.8, risk: 89 },
    { username: 'giftcards_now', karma: 25, ageDays: 3.0, risk: 82 },
    { username: 'claimdeals', karma: 42, ageDays: 4.0, risk: 78 },
    { username: 'prizewinner', karma: 50, ageDays: 5.0, risk: 74 },
  ];

  let postCount = 0;
  for (const a of accountData) {
    await saveUser(redis, { username: a.username, karma: a.karma, accountAgeDays: a.ageDays, riskScore: a.risk, lastSeen: ts(postCount * 10 * MIN) });
  }

  // Distribute posts across subreddits in pyramid, cycling through users and titles
  for (const [sub, count] of POSTS_PER_SUBREDDIT) {
    for (let p = 0; p < count; p++) {
      const author = USERS[postCount % USERS.length];
      const title = TITLES[p % TITLES.length];
      const body = BODIES[p % BODIES.length];
      await savePost(redis, {
        id: `t3_fastgiftz_${postCount}`,
        author,
        subreddit: sub,
        title,
        body,
        url: `https://${DOMAIN}/claim?ref=${author}`,
        timestamp: ts(postCount * 15 * MIN),
      });
      postCount++;
    }
  }

  const uniqueSubs = POSTS_PER_SUBREDDIT.map(([s]) => s);

  // Create the campaign cluster
  await saveCluster(redis, {
    clusterId: 'cluster_operation_fastgiftz',
    members: USERS,
    riskScore: 91,
    reason: [
      'Coordinated Domain Reuse: Same domain (fastgiftz.xyz) posted by 6 accounts.',
      'Cross-Subreddit Spread: Posts distributed across 15 subreddits (pyramid distribution).',
      'Fresh Accounts: All 6 accounts created within a 5-day window, 3 of them under 24 hours old.',
      'Title Similarity: Near-identical promotional language across all 75 posts (92-98% similarity).',
      'Identical Link Structure: All posts use the same affiliate link pattern (fastgiftz.xyz/claim?ref=).',
      'Confidence is 94% based on account grouping size, domain correlation, and posting pattern analysis.',
    ],
    sharedDomain: DOMAIN,
    confidence: 94,
    subreddits: uniqueSubs,
    breakdown: [
      { label: 'Shared Domain Cluster', points: 40 },
      { label: 'Cross-Subreddit Spread', points: 25 },
      { label: 'Fresh Accounts', points: 16 },
      { label: 'Title Similarity', points: 10 },
    ],
  });

  // Add individual alerts for each account
  for (let i = 0; i < USERS.length; i++) {
    await addAlert(redis, {
      id: `alert_fastgiftz_${i}`,
      postId: `t3_fastgiftz_${i}`,
      username: USERS[i],
      severity: i < 3 ? 'Critical' : 'High',
      reason: i < 3
        ? `Fresh account (${accountData[i].ageDays.toFixed(1)}d old) promoting fastgiftz.xyz across ${uniqueSubs.length} subreddits`
        : `Coordinated campaign participant — shared domain fastgiftz.xyz with ${USERS.length - 1} other accounts`,
      timestamp: ts(i * 10 * MIN),
    });
  }

  // Add all accounts to recent users
  for (const u of USERS) {
    await RedisSchema.addRecentUser(redis, u);
  }

  return {
    campaigns: 1,
    accounts: USERS.length,
    posts: postCount,
    subreddits: uniqueSubs.length,
    domains: 1,
  };
}
