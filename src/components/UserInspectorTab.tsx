import { Devvit, useAsync, useForm, useState } from '@devvit/public-api';
import { RedisSchema } from '../redis/schema.js';
import { detectSignals } from '../services/detector/signals.js';
import { generateAIExplanation } from '../api/ai.js';
import { RedditPost, SignalDetails } from '../types/index.js';

interface Props { context: Devvit.Context; initialUsername?: string; key?: string; }

export function UserInspectorTab({ context, initialUsername }: Props): JSX.Element {
  const [username, setUsername] = useState<string>(initialUsername || '');
  const [page, setPage] = useState(0);
  const [userModAction, setUserModAction] = useState<string>('');
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);

  const searchForm = useForm({
    title: 'Analyze User',
    fields: [{ name: 'username', label: 'Reddit Username', type: 'string', required: true, placeholder: 'user123' }],
  }, (values) => {
    if (values.username) setUsername(values.username.trim());
  });

  const { data: recentUsers, loading: recentLoading } = useAsync(async () => {
    return await RedisSchema.getRecentUsers(context.redis, 20);
  }, { depends: [] });

  const { data, loading, error } = useAsync(async () => {
    if (!username) return null as any;
    await RedisSchema.addRecentUser(context.redis, username);
    let user = await RedisSchema.getUser(context.redis, username);
    let karma = 0, accountAgeDays = 0;
    try {
      const ru = await Promise.race([
        context.reddit.getUserByUsername(username),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 5000))
      ]);
      if (ru) { karma = ru.linkKarma + ru.commentKarma; accountAgeDays = (Date.now() - ru.createdAt.getTime()) / (1000 * 60 * 60 * 24); }
    } catch { if (user) { karma = user.karma; accountAgeDays = user.accountAgeDays; } }
    const mappedUser = { username, karma, accountAgeDays, riskScore: 0, lastSeen: Date.now() };
    let post: RedditPost | null = null;
    const posts = await RedisSchema.getUserPosts(context.redis, username, 0, Date.now());
    if (posts.length > 0) post = await RedisSchema.getPost(context.redis, posts[posts.length - 1]);
    if (!post) post = { id: 't3_inspector_temp', author: username, subreddit: 'all', title: 'Unknown', body: '', url: '', timestamp: Date.now() };
    const detection = await detectSignals(context.redis, post, mappedUser);
    mappedUser.riskScore = detection.riskScore;
    await RedisSchema.saveUser(context.redis, mappedUser);
    const explanation = await generateAIExplanation({ settings: context.settings }, post, mappedUser, detection, context.redis);
    return { user: mappedUser, detection, explanation } as any;
  }, { depends: [username] });

  const analysis = data as any;
  const users = (recentUsers as string[]) || [];

  const itemsPerPage = 5;
  const totalPages = Math.ceil(users.length / itemsPerPage) || 1;
  const safePage = Math.min(page, totalPages - 1);
  const currentUsers = users.slice(safePage * itemsPerPage, (safePage + 1) * itemsPerPage);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <vstack width="100%" grow gap="small">
      <hstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" alignment="middle" gap="small">
        {username ? (
          <hstack onPress={() => { setUsername(''); setBriefExpanded(false); setTimelineExpanded(false); setEvidenceExpanded(false); }} padding="xsmall" cornerRadius="full" backgroundColor="#28292A">
            <text size="xsmall" weight="bold" color="#D7DADC">{'<'}</text>
          </hstack>
        ) : null}
        <text size="small" weight="bold" color="#FFFFFF" grow>{username ? `u/${username}` : 'Inspect User'}</text>

        {!username && users.length > itemsPerPage && (
          <hstack gap="small" alignment="middle" backgroundColor="#0B0B0C" padding="xsmall" cornerRadius="full" border="thin" borderColor="#1F2022">
            <hstack onPress={() => setPage(Math.max(0, safePage - 1))} padding="xsmall" cornerRadius="full" backgroundColor={safePage > 0 ? '#28292A' : 'transparent'}>
              <text size="xsmall" weight="bold" color={safePage > 0 ? '#FFFFFF' : '#616366'}>{'<'}</text>
            </hstack>
            <text size="xsmall" weight="bold" color="#818384">{safePage + 1} / {totalPages}</text>
            <hstack onPress={() => setPage(Math.min(totalPages - 1, safePage + 1))} padding="xsmall" cornerRadius="full" backgroundColor={safePage < totalPages - 1 ? '#28292A' : 'transparent'}>
              <text size="xsmall" weight="bold" color={safePage < totalPages - 1 ? '#FFFFFF' : '#616366'}>{'>'}</text>
            </hstack>
          </hstack>
        )}

        {username && analysis ? (
          <hstack gap="small" alignment="middle">
            <hstack onPress={() => setBriefExpanded(true)} padding="xsmall" cornerRadius="small" backgroundColor="#1A1A2D" border="thin" borderColor="#2A2A3D">
              <text size="xsmall" weight="bold" color="#4F8BC9">Intelligence Brief</text>
            </hstack>
            {analysis.detection.timeline && analysis.detection.timeline.length > 0 && (
              <hstack onPress={() => setTimelineExpanded(true)} padding="xsmall" cornerRadius="small" backgroundColor="#1A2A3A" border="thin" borderColor="#2A3A4A">
                <text size="xsmall" weight="bold" color="#5599FF">Timeline</text>
              </hstack>
            )}
            {analysis.detection.evidence && (
              <hstack onPress={() => setEvidenceExpanded(true)} padding="xsmall" cornerRadius="small" backgroundColor="#2D1A0A" border="thin" borderColor="#4A2A08">
                <text size="xsmall" weight="bold" color="#FF8855">Evidence</text>
              </hstack>
            )}
          </hstack>
        ) : (
          <hstack onPress={() => context.ui.showForm(searchForm)} padding="small" backgroundColor="#1A2A3A" cornerRadius="medium" border="thin" borderColor="#2A3A4A">
            <text size="small" weight="bold" color="#5599FF">Scan Account</text>
          </hstack>
        )}
      </hstack>

      {!username ? (
        recentLoading ? (
          <vstack grow alignment="center middle" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="medium">
            <text size="small" color="#616366">Loading recent searches...</text>
          </vstack>
        ) : users.length === 0 ? (
          <vstack grow alignment="center middle" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="medium">
            <text size="small" color="#616366">No recent searches. Use Scan Account to begin.</text>
          </vstack>
        ) : (
          <vstack width="100%" grow gap="small">
            {currentUsers.map((name: string) => (
              <hstack
                key={name}
                padding="small"
                backgroundColor="#111112"
                border="thin"
                borderColor="#1F2022"
                cornerRadius="small"
                alignment="middle"
                gap="small"
                onPress={() => setUsername(name)}
              >
                <text size="small" weight="bold" color="#D7DADC" grow>u/{name}</text>
                <text size="xsmall" weight="bold" color="#616366">{'>'}</text>
              </hstack>
            ))}
          </vstack>
        )
      ) : loading ? (
        <vstack grow alignment="center middle" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="medium" gap="medium">
          <text size="small" color="#5599FF">Scanning u/{username}...</text>
          <vstack gap="small" padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022">
            <text size="xsmall" color="#88FF88">{'>'} Collecting user history...</text>
            <text size="xsmall" color="#88FF88">{'>'} Analyzing signals...</text>
            <text size="xsmall" color="#88FF88">{'>'} Correlating patterns...</text>
            <text size="xsmall" color="#616366">{'>'} Generating findings...</text>
          </vstack>
        </vstack>
      ) : error || !analysis ? (
        <vstack grow alignment="center middle" gap="small" backgroundColor="#2D0A0A" border="thin" borderColor="#4A1515" cornerRadius="medium" padding="medium">
          <text size="small" weight="bold" color="#FF5555">Target Not Found</text>
          <text size="xsmall" color="#FF8888">Unable to extract data for this user.</text>
        </vstack>
      ) : briefExpanded ? (
        <vstack grow width="100%" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="small" gap="small">
          <hstack alignment="middle" gap="small">
            <text size="small" weight="bold" color="#FFFFFF" grow>Intelligence Brief</text>
            <hstack onPress={() => setBriefExpanded(false)} padding="xsmall" cornerRadius="full" backgroundColor="#28292A">
              <text size="xsmall" weight="bold" color="#D7DADC">{'<'}</text>
            </hstack>
          </hstack>
          <vstack padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022" grow>
            <text size="small" color="#818384" wrap width="100%">{analysis.explanation}</text>
          </vstack>
        </vstack>
      ) : timelineExpanded ? (
        <vstack grow width="100%" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="small" gap="small">
          <hstack alignment="middle" gap="small">
            <text size="small" weight="bold" color="#FFFFFF" grow>Investigation Timeline</text>
            <hstack onPress={() => setTimelineExpanded(false)} padding="xsmall" cornerRadius="full" backgroundColor="#28292A">
              <text size="xsmall" weight="bold" color="#D7DADC">{'<'}</text>
            </hstack>
          </hstack>
          <vstack padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022" grow gap="small">
            {analysis.detection.timeline?.slice(0, 6).map((t: any, i: number) => (
              <hstack key={String(i)} gap="small" alignment="middle" padding="xsmall">
                <text size="small" color="#5599FF">{formatTime(t.timestamp)}</text>
                <text size="small" color="#818384">|</text>
                <text size="small" color="#D7DADC">{t.event}</text>
                {t.details && <text size="small" color="#616366">({t.details})</text>}
              </hstack>
            ))}
          </vstack>
        </vstack>
      ) : evidenceExpanded ? (
        <vstack grow width="100%" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="small" gap="small">
          <hstack alignment="middle" gap="small">
            <text size="small" weight="bold" color="#FFFFFF" grow>Evidence</text>
            <hstack onPress={() => setEvidenceExpanded(false)} padding="xsmall" cornerRadius="full" backgroundColor="#28292A">
              <text size="xsmall" weight="bold" color="#D7DADC">{'<'}</text>
            </hstack>
          </hstack>
          <vstack padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022" grow gap="small">
            {analysis.detection.evidence?.sharedDomains && (
              <hstack gap="small"><text size="small" color="#818384">Shared Domain:</text><text size="small" weight="bold" color="#FF8855" wrap>{analysis.detection.evidence.sharedDomains.join(', ')}</text></hstack>
            )}
            {analysis.detection.evidence?.coPosters && (
              <hstack gap="small"><text size="small" color="#818384">Accounts:</text><text size="small" color="#D7DADC" wrap>{analysis.detection.evidence.coPosters.map((m: string) => 'u/' + m).join(', ')}</text></hstack>
            )}
            {analysis.detection.evidence?.subredditSpread && (
              <hstack gap="small"><text size="small" color="#818384">Subreddits:</text><text size="small" weight="bold" color="#D7DADC">{analysis.detection.evidence.subredditSpread}</text></hstack>
            )}
            {analysis.detection.evidence?.timeframeHours && (
              <hstack gap="small"><text size="small" color="#818384">Timeframe:</text><text size="small" weight="bold" color="#D7DADC">{analysis.detection.evidence.timeframeHours}h</text></hstack>
            )}
            {!analysis.detection.evidence?.sharedDomains && !analysis.detection.evidence?.coPosters && (
              <text size="small" color="#616366">No network evidence found for this account.</text>
            )}
          </vstack>
        </vstack>
      ) : (
        <vstack width="100%" grow gap="small">
          <hstack width="100%" grow gap="medium">
            <vstack width="25%" gap="small">
              <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="none" alignment="center middle">
                <text size="xsmall" color="#818384">Threat Score</text>
                <text size="xlarge" weight="bold" color={analysis.user.riskScore >= 70 ? '#FF5555' : analysis.user.riskScore >= 40 ? '#FF8855' : '#88FF88'}>{analysis.user.riskScore}</text>
              </vstack>
              <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="none" alignment="center middle">
                <text size="xsmall" color="#818384">Karma</text>
                <text size="xlarge" weight="bold" color="#FFFFFF">{analysis.user.karma}</text>
              </vstack>
              <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="none" alignment="center middle">
                <text size="xsmall" color="#818384">Age</text>
                <text size="xlarge" weight="bold" color="#FFFFFF">{analysis.user.accountAgeDays.toFixed(0)}d</text>
              </vstack>
            </vstack>

            <vstack width="75%" grow gap="small">
              {analysis.detection.triggeredSignals.length > 0 && (
                <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="small" width="100%">
                  <text size="xsmall" weight="bold" color="#FFFFFF">Triggered Heuristics</text>
                  {analysis.detection.triggeredSignals.map((sig: SignalDetails, i: number) => (
                    <hstack key={String(i)} gap="medium" alignment="middle" padding="small" backgroundColor="#0B0B0C" border="thin" borderColor="#1F2022" cornerRadius="small">
                      <text size="small" weight="bold" color={sig.score >= 25 ? '#FF5555' : '#FF8855'}>+{sig.score}</text>
                      <text size="small" weight="bold" color="#D7DADC">{sig.name}</text>
                      <text size="xsmall" color="#818384" wrap>{sig.details}</text>
                    </hstack>
                  ))}
                </vstack>
              )}

              {analysis.detection.triggeredSignals.length === 0 && (
                <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" alignment="center middle">
                  <text size="xsmall" color="#616366">No heuristics triggered</text>
                </vstack>
              )}

              <hstack gap="small" alignment="middle" width="100%">
                <hstack
                  grow
                  padding="small"
                  backgroundColor={userModAction === 'reviewed' ? '#1A2A1A' : '#111112'}
                  border="thin"
                  borderColor={userModAction === 'reviewed' ? '#2A4A2A' : '#1F2022'}
                  cornerRadius="small"
                  alignment="center middle"
                  onPress={async () => {
                    await RedisSchema.performModAction(context.redis, {
                      itemType: 'user', itemId: username, action: 'reviewed', moderator: 'mod', timestamp: Date.now()
                    });
                    setUserModAction('reviewed');
                  }}
                >
                  <text size="xsmall" weight="bold" color={userModAction === 'reviewed' ? '#88FF88' : '#818384'}>
                    {userModAction === 'reviewed' ? 'Reviewed' : 'Mark Reviewed'}
                  </text>
                </hstack>
                <hstack
                  grow
                  padding="small"
                  backgroundColor={userModAction === 'dismissed' ? '#2D1A0A' : '#111112'}
                  border="thin"
                  borderColor={userModAction === 'dismissed' ? '#4A2A08' : '#1F2022'}
                  cornerRadius="small"
                  alignment="center middle"
                  onPress={async () => {
                    await RedisSchema.performModAction(context.redis, {
                      itemType: 'user', itemId: username, action: 'dismissed', moderator: 'mod', timestamp: Date.now()
                    });
                    setUserModAction('dismissed');
                  }}
                >
                  <text size="xsmall" weight="bold" color={userModAction === 'dismissed' ? '#FF8855' : '#818384'}>
                    {userModAction === 'dismissed' ? 'Dismissed' : 'Dismiss'}
                  </text>
                </hstack>
              </hstack>
            </vstack>
          </hstack>
        </vstack>
      )}
    </vstack>
  );
}
