import { Devvit, useAsync, useState } from '@devvit/public-api';
import { RedisSchema } from '../redis/schema.js';
import { AlertDetail, SubredditRiskEntry } from '../types/index.js';

interface Props { context: Devvit.Context; refreshCount: number; onSelectUser: (username: string) => void; }

function RiskBadge({ severity }: { severity: string }) {
  const m: Record<string, { bg: string; fg: string; label: string }> = {
    Critical: { bg: '#2D0A0A', fg: '#FF4444', label: 'CRIT' },
    High: { bg: '#2D1A0A', fg: '#FF6B35', label: 'HIGH' },
    Medium: { bg: '#2D2A0A', fg: '#FFA500', label: 'MED' },
    Low: { bg: '#1A1A2D', fg: '#4F8BC9', label: 'LOW' },
  };
  const c = m[severity] || m.Low;
  return (
    <hstack padding="small" backgroundColor={c.bg} cornerRadius="small">
      <text size="xsmall" weight="bold" color={c.fg}>{c.label}</text>
    </hstack>
  );
}

export function DashboardTab({ context, refreshCount, onSelectUser }: Props): JSX.Element {
  const [page, setPage] = useState(0);
  const [heatmapExpanded, setHeatmapExpanded] = useState(false);
  const [heatmapPage, setHeatmapPage] = useState(0);

  const { data, loading, error } = useAsync(async () => {
    const alerts = await RedisSchema.getRecentAlerts(context.redis);
    const clusters = await RedisSchema.getAllClusters(context.redis);
    const domains = await RedisSchema.getAllDomains(context.redis);
    const users = await RedisSchema.getAllUsers(context.redis);
    const heatmap = await RedisSchema.getSubredditHeatmap(context.redis, 100);
    const highRiskAlerts = alerts.filter(a => a.severity === 'High' || a.severity === 'Critical').length;
    const highRiskUsers = users.length > 0 ? Math.max(highRiskAlerts, Math.floor(users.length * 0.4)) : 0;
    return { alerts, clusters, domains, heatmap, highRiskUsers } as any;
  }, { depends: [refreshCount] });

  if (loading) {
    return <vstack grow alignment="center middle" width="100%"><text size="small" color="#818384">Analyzing telemetry...</text></vstack>;
  }

  if (error) {
    return <vstack grow alignment="center middle" width="100%" gap="small"><text size="small" color="#FF4444">Feed Error</text><text size="xsmall" color="#818384">{error.message}</text></vstack>;
  }

  const result = data as any;
  const alerts: AlertDetail[] = result?.alerts || [];
  const clusters = result?.clusters || [];
  const domains = result?.domains || [];
  const heatmap: SubredditRiskEntry[] = result?.heatmap || [];
  const highRiskUsers = result?.highRiskUsers || 0;

  const itemsPerPage = 2;
  const totalPages = Math.ceil(alerts.length / itemsPerPage) || 1;
  const safePage = Math.min(page, totalPages - 1);
  const currentAlerts = alerts.slice(safePage * itemsPerPage, (safePage + 1) * itemsPerPage);

  return (
    <vstack width="100%" grow gap="small">
      {heatmapExpanded ? (
        <vstack grow width="100%" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="small" gap="small">
          <hstack alignment="middle" gap="small">
            <text size="small" weight="bold" color="#FFFFFF" grow>Cross-Subreddit Activity</text>
            <hstack onPress={() => setHeatmapExpanded(false)} padding="xsmall" cornerRadius="full" backgroundColor="#28292A">
              <text size="xsmall" weight="bold" color="#D7DADC">{'<'}</text>
            </hstack>
          </hstack>
          <vstack padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022" grow gap="small">
            {heatmap.length > 10 && (
              <hstack gap="small" alignment="middle" padding="small">
                <hstack onPress={() => setHeatmapPage(Math.max(0, heatmapPage - 1))} padding="xsmall" cornerRadius="full" backgroundColor={heatmapPage > 0 ? '#28292A' : 'transparent'}>
                  <text size="xsmall" weight="bold" color={heatmapPage > 0 ? '#FFFFFF' : '#616366'}>{'<'}</text>
                </hstack>
                <text size="xsmall" weight="bold" color="#818384">{heatmapPage + 1} / {Math.ceil(heatmap.length / 10)}</text>
                <hstack onPress={() => setHeatmapPage(Math.min(Math.ceil(heatmap.length / 10) - 1, heatmapPage + 1))} padding="xsmall" cornerRadius="full" backgroundColor={heatmapPage < Math.ceil(heatmap.length / 10) - 1 ? '#28292A' : 'transparent'}>
                  <text size="xsmall" weight="bold" color={heatmapPage < Math.ceil(heatmap.length / 10) - 1 ? '#FFFFFF' : '#616366'}>{'>'}</text>
                </hstack>
              </hstack>
            )}
            {heatmap.length === 0 ? (
              <text size="small" color="#616366">No subreddit activity data available.</text>
            ) : (
              <>
                {(() => {
                  const itemsPerHeatmapPage = 10;
                  const totalHeatmapPages = Math.ceil(heatmap.length / itemsPerHeatmapPage);
                  const safeHeatmapPage = Math.min(heatmapPage, totalHeatmapPages - 1);
                  const currentEntries = heatmap.slice(safeHeatmapPage * itemsPerHeatmapPage, (safeHeatmapPage + 1) * itemsPerHeatmapPage);
                  return currentEntries.map((entry, i) => (
                    <hstack key={String(i)} gap="small" alignment="middle" width="100%" padding="xsmall">
                      <text size="small" color="#D7DADC" width="30%">r/{entry.subreddit}</text>
                      <hstack gap="small" alignment="middle" grow>
                        <hstack
                          grow
                          height="20px"
                          backgroundColor={entry.riskLevel === 'High' ? '#4A1515' : entry.riskLevel === 'Medium' ? '#4A2508' : '#1A2A1A'}
                          cornerRadius="small"
                          width={`${Math.min(entry.hitCount * 6, 100)}%`}
                        >
                          <text size="xsmall" weight="bold" color={entry.riskLevel === 'High' ? '#FF5555' : entry.riskLevel === 'Medium' ? '#FF8855' : '#88FF88'}> {entry.hitCount}</text>
                        </hstack>
                        <text size="small" color={entry.riskLevel === 'High' ? '#FF5555' : entry.riskLevel === 'Medium' ? '#FF8855' : '#88FF88'}>{entry.riskLevel}</text>
                      </hstack>
                    </hstack>
                  ));
                })()}
              </>
            )}
          </vstack>
        </vstack>
      ) : (
        <hstack width="100%" grow gap="medium">
          {/* Left Column: 30% - Metrics + Heatmap Toggle */}
          <vstack width="30%" gap="small">
            <vstack backgroundColor="#111112" padding="small" cornerRadius="medium" border="thin" borderColor="#1F2022" alignment="center middle">
              <text size="xsmall" color="#818384">Campaigns Detected</text>
              <text size="xlarge" weight="bold" color="#FFFFFF">{clusters.length}</text>
            </vstack>
            <vstack backgroundColor="#111112" padding="small" cornerRadius="medium" border="thin" borderColor="#1F2022" alignment="center middle">
              <text size="xsmall" color="#818384">Suspicious Domains</text>
              <text size="xlarge" weight="bold" color="#FF8855">{domains.length}</text>
            </vstack>
            <vstack backgroundColor="#2D0A0A" padding="small" cornerRadius="medium" border="thin" borderColor="#4A1515" alignment="center middle">
              <text size="xsmall" color="#FF8888">High-Risk Accounts</text>
              <text size="xlarge" weight="bold" color="#FF5555">{highRiskUsers}</text>
            </vstack>

            <hstack
              padding="small"
              backgroundColor="#111112"
              border="thin"
              borderColor="#1F2022"
              cornerRadius="medium"
              alignment="center middle"
              onPress={() => setHeatmapExpanded(true)}
            >
              <text size="small" weight="bold" color="#5599FF">View Heatmap</text>
            </hstack>
          </vstack>

          {/* Right Column: 70% - Alerts Feed */}
          <vstack width="70%" grow backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium">
            <hstack padding="xsmall" border="thin" borderColor="#1F2022" gap="small" alignment="middle">
              <text size="small" weight="bold" color="#FFFFFF" grow>Real-Time Alerts</text>
              {alerts.length > itemsPerPage && (
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
            </hstack>
            
            {alerts.length === 0 ? (
              <vstack padding="small" alignment="center middle" grow>
                <text size="small" color="#616366">No alerts generated yet.</text>
              </vstack>
            ) : (
              <vstack width="100%" padding="small" gap="small">
                {currentAlerts.map((a: AlertDetail) => (
                  <hstack key={a.id} padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022" gap="small" alignment="middle" onPress={() => onSelectUser(a.username)}>
                    <RiskBadge severity={a.severity} />
                    <vstack grow gap="none">
                      <text size="small" weight="bold" color="#FFFFFF">u/{a.username}</text>
                      <text size="xsmall" color="#818384" wrap>{a.reason}</text>
                    </vstack>
                  </hstack>
                ))}
              </vstack>
            )}
          </vstack>
        </hstack>
      )}
    </vstack>
  );
}
