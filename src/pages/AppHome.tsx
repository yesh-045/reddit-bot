import { Devvit, useState } from '@devvit/public-api';
import { DashboardTab } from '../components/DashboardTab.js';
import { UserInspectorTab } from '../components/UserInspectorTab.js';
import { CampaignExplorerTab } from '../components/CampaignExplorerTab.js';
import { SettingsTab } from '../components/SettingsTab.js';

type TabKey = 'dashboard' | 'inspector' | 'explorer' | 'settings';

const nav: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Monitor' },
  { key: 'inspector', label: 'Users' },
  { key: 'explorer', label: 'Campaigns' },
  { key: 'settings', label: 'Config' },
];

export function AppHome(context: Devvit.Context): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [selectedUser, setSelectedUser] = useState<string>('');

  const triggerRefresh = () => setRefreshCount(p => p + 1);

  const handleSelectUser = (username: string) => {
    setSelectedUser(username);
    setActiveTab('inspector');
  };

  return (
    <vstack width="100%" height="100%" backgroundColor="#080808">
      {/* Navbar */}
      <hstack width="100%" padding="small" backgroundColor="#111112" border="thin" borderColor="#1F2022" alignment="center" gap="medium">
        {nav.map(item => {
          const active = activeTab === item.key;
          return (
            <vstack
              key={item.key}
              padding="xsmall"
              cornerRadius="small"
              gap="none"
              onPress={() => setActiveTab(item.key)}
            >
              <text size="small" weight={active ? 'bold' : 'regular'} color={active ? '#FFFFFF' : '#818384'}>
                {item.label}
              </text>
              {active && <hstack height="2px" width="100%" backgroundColor="#5599FF" cornerRadius="small" />}
            </vstack>
          );
        })}
      </hstack>

      {/* Main Content Area */}
      <vstack grow width="100%" padding="small" gap="small">
        {activeTab === 'dashboard' && <DashboardTab context={context} refreshCount={refreshCount} onSelectUser={handleSelectUser} />}
        {activeTab === 'inspector' && <UserInspectorTab key={selectedUser || 'default'} context={context} initialUsername={selectedUser} />}
        {activeTab === 'explorer' && <CampaignExplorerTab context={context} refreshCount={refreshCount} onSelectUser={handleSelectUser} />}
        {activeTab === 'settings' && <SettingsTab context={context} triggerRefresh={triggerRefresh} />}
      </vstack>
    </vstack>
  );
}
