import { Devvit, useAsync, useState } from '@devvit/public-api';
import { RedisSchema } from '../redis/schema.js';
import { CampaignCluster } from '../types/index.js';

interface Props { context: Devvit.Context; refreshCount: number; onSelectUser: (username: string) => void; }

function generateInvestigationReport(c: CampaignCluster): string {
  const lines: string[] = [];
  lines.push(`CAMPAIGN INVESTIGATION REPORT`);
  lines.push(`Campaign ID: ${c.clusterId}`);
  lines.push(`Type: ${c.sharedDomain ? 'Domain Sharing Campaign' : c.sharedTitlePattern ? 'Title Pattern Campaign' : 'Suspicious Cluster'}`);
  lines.push(`Risk Score: ${c.riskScore}/100`);
  lines.push(`Confidence: ${c.confidence}%`);
  lines.push(`Accounts Involved: ${c.members.length}`);
  lines.push(`Investigated: ${new Date(Date.now()).toISOString().slice(0, 19).replace('T', ' ')} UTC`);
  lines.push('');
  if (c.sharedDomain) lines.push(`Shared Domain: ${c.sharedDomain}`);
  if (c.sharedTitlePattern) lines.push(`Title Pattern: ${c.sharedTitlePattern}`);
  lines.push('');
  lines.push(`Member Accounts:`);
  for (const m of c.members) lines.push(`  • u/${m}`);
  lines.push('');
  lines.push(`Analysis:`);
  for (const r of c.reason) lines.push(`  • ${r}`);
  lines.push('');
  lines.push('Status: Active investigation — recommend monitoring for new accounts.');
  return lines.join('\n');
}

export function CampaignExplorerTab({ context, refreshCount, onSelectUser }: Props): JSX.Element {
  const [page, setPage] = useState(0);
  const [campaignActions, setCampaignActions] = useState<Record<string, string>>({});
  const [investigationReports, setInvestigationReports] = useState<Record<string, string>>({});
  const [overlayCluster, setOverlayCluster] = useState<string | null>(null);
  const [analysisOverlay, setAnalysisOverlay] = useState(false);
  const [accountsOverlay, setAccountsOverlay] = useState(false);
  const [subredditsOverlay, setSubredditsOverlay] = useState(false);
  const { data, loading, error } = useAsync(async () => (await RedisSchema.getAllClusters(context.redis)) as any, { depends: [refreshCount] });

  if (loading) return <vstack grow alignment="center middle"><text size="small" color="#636466">Loading campaigns...</text></vstack>;
  if (error) return <vstack grow alignment="center middle" gap="small"><text size="small" color="#FF4444">Error</text><text size="xsmall" color="#818384">{error.message}</text></vstack>;

  const clusters = (data as CampaignCluster[]) || [];
  const itemsPerPage = 1;
  const totalPages = Math.ceil(clusters.length / itemsPerPage) || 1;
  const safePage = Math.min(page, totalPages - 1);
  const currentClusters = clusters.slice(safePage * itemsPerPage, (safePage + 1) * itemsPerPage);

  const getCampaignLabel = (c: CampaignCluster): string => {
    if (c.sharedDomain) return 'Domain Sharing Campaign';
    if (c.sharedTitlePattern) return 'Title Pattern Campaign';
    return 'Suspicious Cluster';
  };

  const current = currentClusters[0];

  return (
    <vstack width="100%" grow gap="small">
      {overlayCluster && current ? accountsOverlay ? (
        <vstack grow width="100%" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="small" gap="small">
          <hstack alignment="middle" gap="small">
            <text size="small" weight="bold" color="#FFFFFF" grow>All Accounts ({current.members.length})</text>
            <hstack onPress={() => setAccountsOverlay(false)} padding="xsmall" cornerRadius="full" backgroundColor="#28292A">
              <text size="xsmall" weight="bold" color="#D7DADC">{'<'}</text>
            </hstack>
          </hstack>
          <vstack padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022" grow gap="small">
            {current.members.reduce((rows: string[][], m, i) => {
              if (i % 4 === 0) rows.push([]);
              rows[rows.length - 1].push(m);
              return rows;
            }, []).map((row, ri) => (
              <hstack key={String(ri)} gap="small">
                {row.map((m, ci) => (
                  <hstack key={String(ci)} padding="xsmall" backgroundColor="#1A2A3A" cornerRadius="small" border="thin" borderColor="#2A3A4A" onPress={() => onSelectUser(m)}>
                    <text size="xsmall" color="#5599FF">{m}</text>
                  </hstack>
                ))}
              </hstack>
            ))}
          </vstack>
        </vstack>
      ) : subredditsOverlay ? (
        <vstack grow width="100%" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="small" gap="small">
          <hstack alignment="middle" gap="small">
            <text size="small" weight="bold" color="#FFFFFF" grow>All Affected Subreddits ({(current.subreddits || []).length})</text>
            <hstack onPress={() => setSubredditsOverlay(false)} padding="xsmall" cornerRadius="full" backgroundColor="#28292A">
              <text size="xsmall" weight="bold" color="#D7DADC">{'<'}</text>
            </hstack>
          </hstack>
          <vstack padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022" grow gap="small">
            {(current.subreddits || []).reduce((rows: string[][], s, i) => {
              if (i % 4 === 0) rows.push([]);
              rows[rows.length - 1].push(s);
              return rows;
            }, []).map((row, ri) => (
              <hstack key={String(ri)} gap="small">
                {row.map((s, ci) => (
                  <hstack key={String(ci)} padding="xsmall" backgroundColor="#1A1A2D" cornerRadius="small" border="thin" borderColor="#2A2A3D">
                    <text size="xsmall" color="#4F8BC9">r/{s}</text>
                  </hstack>
                ))}
              </hstack>
            ))}
          </vstack>
        </vstack>
      ) : analysisOverlay ? (
        <vstack grow width="100%" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" padding="small" gap="small">
          <hstack alignment="middle" gap="small">
            <text size="small" weight="bold" color="#FFFFFF" grow>Analysis</text>
            <hstack onPress={() => setAnalysisOverlay(false)} padding="xsmall" cornerRadius="full" backgroundColor="#28292A">
              <text size="xsmall" weight="bold" color="#D7DADC">{'<'}</text>
            </hstack>
          </hstack>
          <vstack padding="small" backgroundColor="#0B0B0C" cornerRadius="small" border="thin" borderColor="#1F2022" grow gap="small">
            {current.reason.map((r: string, ri: number) => (
              <text key={String(ri)} size="small" color="#818384" wrap>{`• ${r}`}</text>
            ))}
          </vstack>
        </vstack>
      ) : (
        <vstack grow width="100%" gap="small">
          <hstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" alignment="middle" gap="small">
            <text size="small" weight="bold" color="#FFFFFF" grow>Campaign Investigation Report</text>
            <hstack onPress={() => setAnalysisOverlay(true)} padding="xsmall" cornerRadius="small" backgroundColor="#1A2A3A" border="thin" borderColor="#2A3A4A">
              <text size="xsmall" weight="bold" color="#5599FF">Analysis</text>
            </hstack>
            <hstack
              padding="xsmall"
              cornerRadius="full"
              backgroundColor="#2D0A0A"
              onPress={() => { setOverlayCluster(null); setAnalysisOverlay(false); }}
            >
              <text size="small" weight="bold" color="#FF5555">✕</text>
            </hstack>
          </hstack>

          <hstack width="100%" grow gap="medium">
            <vstack width="25%" gap="small">
              <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="none" alignment="center middle">
                <text size="xsmall" color="#818384">Risk Score</text>
                <text size="xlarge" weight="bold" color={current.riskScore >= 70 ? '#FF5555' : '#FF8855'}>{current.riskScore}</text>
              </vstack>
              {current.breakdown && current.breakdown.length > 0 ? (
                <vstack padding="small" backgroundColor="#0B0B0C" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="small">
                  <text size="xsmall" weight="bold" color="#818384">Risk Breakdown</text>
                  <vstack gap="none">
                    {current.breakdown.map((b, i) => (
                      <hstack key={String(i)} gap="small" alignment="middle">
                        <text size="xsmall" color="#D7DADC" grow>{b.label}</text>
                        <text size="xsmall" weight="bold" color="#FF8855">+{b.points}</text>
                      </hstack>
                    ))}
                  </vstack>
                </vstack>
              ) : null}
            </vstack>

            <vstack width="75%" grow gap="small">
              <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="small" width="100%" grow>
                <text size="xsmall" weight="bold" color="#FFFFFF">Evidence</text>
                {current.sharedDomain ? (
                  <hstack gap="small">
                    <text size="xsmall" color="#818384">Shared Domain:</text>
                    <text size="xsmall" color="#FF8855" wrap>{current.sharedDomain}</text>
                  </hstack>
                ) : null}
                {current.sharedTitlePattern ? (
                  <hstack gap="small">
                    <text size="xsmall" color="#818384">Title Pattern:</text>
                    <text size="xsmall" color="#D7DADC" wrap>{current.sharedTitlePattern}</text>
                  </hstack>
                ) : null}
                <hstack gap="small">
                  <text size="xsmall" color="#818384">Accounts ({current.members.length}):</text>
                </hstack>
                <vstack gap="small">
                  {(() => {
                    const shown = current.members.slice(0, 3);
                    const more = current.members.length > 3;
                    const items = more ? shown : current.members;
                    const rows: string[][] = [];
                    items.forEach((m, i) => { if (i % 4 === 0) rows.push([]); rows[rows.length - 1].push(m); });
                    return rows.map((row, ri) => (
                      <hstack key={String(ri)} gap="small">
                        {row.map((m, ci) => (
                          <hstack key={String(ci)} padding="xsmall" backgroundColor="#1A2A3A" cornerRadius="small" border="thin" borderColor="#2A3A4A" onPress={() => onSelectUser(m)}>
                            <text size="xsmall" color="#5599FF">{m}</text>
                          </hstack>
                        ))}
                        {more && ri === rows.length - 1 && (
                          <hstack padding="xsmall" cornerRadius="small" backgroundColor="#1A2A3A" border="thin" borderColor="#2A3A4A" onPress={() => setAccountsOverlay(true)}>
                            <text size="xsmall" weight="bold" color="#5599FF">+{current.members.length - 3} more</text>
                          </hstack>
                        )}
                      </hstack>
                    ));
                  })()}
                </vstack>
                {current.subreddits && current.subreddits.length > 0 ? (
                  <>
                    <hstack gap="small">
                      <text size="xsmall" color="#818384">Affected Subreddits ({current.subreddits.length}):</text>
                    </hstack>
                    <vstack gap="small">
                      {(() => {
                        const subs = current.subreddits || [];
                        const shown = subs.slice(0, 3);
                        const more = subs.length > 3;
                        const items = more ? shown : subs;
                        const rows: string[][] = [];
                        items.forEach((s, i) => { if (i % 4 === 0) rows.push([]); rows[rows.length - 1].push(s); });
                        return rows.map((row, ri) => (
                          <hstack key={String(ri)} gap="small">
                            {row.map((s, ci) => (
                              <hstack key={String(ci)} padding="xsmall" backgroundColor="#1A1A2D" cornerRadius="small" border="thin" borderColor="#2A2A3D">
                                <text size="xsmall" color="#4F8BC9">r/{s}</text>
                              </hstack>
                            ))}
                            {more && ri === rows.length - 1 && (
                              <hstack padding="xsmall" cornerRadius="small" backgroundColor="#1A1A2D" border="thin" borderColor="#2A2A3D" onPress={() => setSubredditsOverlay(true)}>
                                <text size="xsmall" weight="bold" color="#4F8BC9">+{subs.length - 3} more</text>
                              </hstack>
                            )}
                          </hstack>
                        ));
                      })()}
                    </vstack>
                  </>
                ) : null}
              </vstack>


            </vstack>
          </hstack>
        </vstack>
      ) : clusters.length === 0 ? (
        <vstack grow alignment="center middle" padding="medium" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium">
          <text size="small" color="#616366">No coordinated groups detected.</text>
        </vstack>
      ) : (
        <vstack width="100%" grow backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium">
          <hstack padding="xsmall" border="thin" borderColor="#1F2022" gap="small" alignment="middle">
            <text size="small" weight="bold" color="#FFFFFF" grow>Detected Campaigns ({clusters.length})</text>
            {clusters.length > itemsPerPage && (
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

          <vstack width="100%" padding="small" gap="small">
            {currentClusters.map((c: CampaignCluster) => {
              const action = campaignActions[c.clusterId];
              const hasReport = !!investigationReports[c.clusterId];
              return (
                <vstack
                  key={c.clusterId}
                  padding="small"
                  backgroundColor="#0B0B0C"
                  border="thin"
                  borderColor="#1F2022"
                  cornerRadius="small"
                  gap="small"
                  width="100%"
                >
                  <hstack width="100%" alignment="middle start" gap="small">
                    <vstack grow>
                      <text size="small" weight="bold" color="#FFFFFF">{getCampaignLabel(c)}</text>
                      <text size="xsmall" color="#616366">{String(c.confidence)}% confidence | {c.members.length} accounts</text>
                    </vstack>
                    <hstack padding="xsmall" border="thin" borderColor={c.riskScore >= 70 ? '#4A1515' : '#4A2508'} backgroundColor={c.riskScore >= 70 ? '#2D0A0A' : '#2D1A0A'} cornerRadius="full">
                      <text size="xsmall" weight="bold" color={c.riskScore >= 70 ? '#FF5555' : '#FF8855'}>RISK {c.riskScore}</text>
                    </hstack>
                  </hstack>

                  <vstack gap="small" padding="xsmall">
                    {c.sharedDomain ? (
                      <hstack gap="small">
                        <text size="xsmall" color="#818384" weight="bold">Shared Domain:</text>
                        <text size="xsmall" color="#FF8855" wrap>{c.sharedDomain}</text>
                      </hstack>
                    ) : null}

                    {c.sharedTitlePattern ? (
                      <hstack gap="small">
                        <text size="xsmall" color="#818384" weight="bold">Title Pattern:</text>
                        <text size="xsmall" color="#D7DADC" wrap>{c.sharedTitlePattern}</text>
                      </hstack>
                    ) : null}

                    <hstack gap="small">
                      <text size="xsmall" color="#818384" weight="bold">{`Accounts (${c.members.length}):`}</text>
                      <text size="xsmall" color="#D7DADC" wrap>{c.members.map(m => 'u/' + m).join(', ')}</text>
                    </hstack>

                    <vstack gap="none">
                      <text size="xsmall" color="#818384" weight="bold">Analysis</text>
                      {c.reason.slice(0, 3).map((r, ri) => (
                        <text key={String(ri)} size="xsmall" color="#818384" wrap>{`• ${r}`}</text>
                      ))}
                    </vstack>

                    <hstack gap="small" alignment="middle" width="100%">
                      {hasReport ? (
                        <hstack
                          grow
                          padding="small"
                          backgroundColor="#1A2A3A"
                          border="thin"
                          borderColor="#2A3A4A"
                          cornerRadius="small"
                          alignment="center middle"
                          onPress={() => setOverlayCluster(c.clusterId)}
                        >
                          <text size="xsmall" weight="bold" color="#5599FF">View Investigation</text>
                        </hstack>
                      ) : (
                        <hstack
                          grow
                          padding="small"
                          backgroundColor={action === 'dismissed' ? '#111112' : '#1A2A3A'}
                          border="thin"
                          borderColor={action === 'dismissed' ? '#1F2022' : '#2A3A4A'}
                          cornerRadius="small"
                          alignment="center middle"
                          onPress={async () => {
                            const report = generateInvestigationReport(c);
                            setInvestigationReports(prev => ({ ...prev, [c.clusterId]: report }));
                            setCampaignActions(prev => ({ ...prev, [c.clusterId]: 'investigating' }));
                            await RedisSchema.performModAction(context.redis, {
                              itemType: 'campaign', itemId: c.clusterId, action: 'investigating', moderator: 'mod', timestamp: Date.now()
                            });
                            setOverlayCluster(c.clusterId);
                          }}
                        >
                          <text size="xsmall" weight="bold" color="#5599FF">Investigate Campaign</text>
                        </hstack>
                      )}
                      <hstack
                        grow
                        padding="small"
                        backgroundColor={action === 'dismissed' ? '#2D1A0A' : '#111112'}
                        border="thin"
                        borderColor={action === 'dismissed' ? '#4A2A08' : '#1F2022'}
                        cornerRadius="small"
                        alignment="center middle"
                        onPress={async () => {
                          await RedisSchema.performModAction(context.redis, {
                            itemType: 'campaign', itemId: c.clusterId, action: 'dismissed', moderator: 'mod', timestamp: Date.now()
                          });
                          setCampaignActions(prev => ({ ...prev, [c.clusterId]: 'dismissed' }));
                        }}
                      >
                        <text size="xsmall" weight="bold" color={action === 'dismissed' ? '#FF8855' : '#818384'}>
                          {action === 'dismissed' ? 'Dismissed' : 'Dismiss'}
                        </text>
                      </hstack>
                    </hstack>
                  </vstack>
                </vstack>
              );
            })}
          </vstack>
        </vstack>
      )}
    </vstack>
  );
}
