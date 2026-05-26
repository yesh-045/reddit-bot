import { Devvit, useAsync, useForm } from '@devvit/public-api';
import { RedisSchema } from '../redis/schema.js';
import { seedDemoDataset } from '../services/detector/seeder.js';

interface Props { context: Devvit.Context; triggerRefresh: () => void; }

export function SettingsTab({ context, triggerRefresh }: Props): JSX.Element {
  const { data: threshold } = useAsync(async () => RedisSchema.getRiskThreshold(context.redis));
  const { data: savedKey } = useAsync(async () => (await RedisSchema.getApiKey(context.redis)) || '', { depends: [] });

  const currentKey = savedKey as string | undefined;

  const apiKeyForm = useForm({
    title: 'Gemini API Key',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'string', required: true, defaultValue: currentKey || '', placeholder: 'AIza...' },
    ],
  }, async (values) => {
    const key = (values.apiKey as string).trim();
    if (key) {
      await RedisSchema.setApiKey(context.redis, key);
      await RedisSchema.setAiProvider(context.redis, 'gemini');
      context.ui.showToast('Gemini API key saved');
    }
  });

  const updateThreshold = async (value: number) => {
    await RedisSchema.setRiskThreshold(context.redis, value);
    context.ui.showToast(`Threshold set to ${value}%`);
    triggerRefresh();
  };

  const handleLoadDemoDataset = async () => {
    context.ui.showToast('Loading demo dataset...');
    try {
      const stats = await seedDemoDataset(context.redis);
      context.ui.showToast(`Demo Dataset Loaded: ${stats.campaigns} campaign, ${stats.accounts} accounts, ${stats.posts} posts, ${stats.subreddits} subreddits, ${stats.domains} domain`);
      triggerRefresh();
    } catch (e) {
      context.ui.showToast(`Error: ${(e as Error).message}`);
    }
  };

  const handleResetDatabase = async () => {
    try {
      await RedisSchema.clearAllData(context.redis);
      context.ui.showToast('Database cleared');
      triggerRefresh();
    } catch (e) {
      context.ui.showToast(`Error: ${(e as Error).message}`);
    }
  };

  const currentThreshold = threshold ?? 70;

  return (
    <vstack width="100%" grow gap="small">
      <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="small" width="100%">
        <vstack gap="none">
          <text size="small" weight="bold" color="#FFFFFF">Alert Sensitivity</text>
          <text size="xsmall" color="#818384">Alerts trigger when risk meets this score.</text>
        </vstack>
        <hstack gap="small" alignment="middle" padding="xsmall" backgroundColor="#0B0B0C" cornerRadius="full" border="thin" borderColor="#1F2022">
          {[50, 70, 90].map((val) => (
            <hstack
              key={String(val)}
              padding="small"
              cornerRadius="full"
              backgroundColor={currentThreshold === val ? '#28292A' : 'transparent'}
              onPress={() => updateThreshold(val)}
            >
               <text size="xsmall" weight="bold" color={currentThreshold === val ? '#FFFFFF' : '#616366'}>Risk {val}+</text>
            </hstack>
          ))}
        </hstack>
      </vstack>

      <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="small" width="100%">
        <vstack gap="none">
          <text size="small" weight="bold" color="#FFFFFF">Gemini AI</text>
          <text size="xsmall" color="#818384">{currentKey ? 'API key configured' : 'No API key set — using local fallback'}</text>
        </vstack>
        <hstack
          padding="small"
          backgroundColor="#1A2A3A"
          border="thin"
          borderColor="#2A3A4A"
          cornerRadius="small"
          alignment="center middle"
          onPress={() => context.ui.showForm(apiKeyForm)}
        >
          <text size="small" weight="bold" color="#5599FF">{currentKey ? 'Update Key' : 'Set Gemini Key'}</text>
        </hstack>
      </vstack>

      <vstack padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" cornerRadius="medium" gap="small" width="100%">
        <text size="small" weight="bold" color="#FFFFFF">Demo Dataset</text>
        <hstack gap="small" alignment="middle" width="100%">
          <hstack grow alignment="center middle" padding="small" cornerRadius="full" backgroundColor="#1A3A1A" border="thin" borderColor="#2A4A2A" onPress={handleLoadDemoDataset}>
            <text size="xsmall" weight="bold" color="#88FF88">Load Demo Dataset</text>
          </hstack>
          <hstack grow alignment="center middle" padding="small" cornerRadius="full" backgroundColor="#2D0A0A" border="thin" borderColor="#4A1515" onPress={handleResetDatabase}>
            <text size="xsmall" weight="bold" color="#FF5555">Wipe Storage</text>
          </hstack>
        </hstack>
      </vstack>
    </vstack>
  );
}
