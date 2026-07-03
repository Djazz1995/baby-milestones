import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { tokens } from '@/theme/tokens';

/**
 * The ONE bottom tab navigator: Home · Agenda · Stats · Settings. Dark bar,
 * accent-1 active tint, native SF Symbol icons. Identical on every tab screen.
 */
export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={tokens.bg}
      tintColor={tokens.accent1}
      labelStyle={{ color: tokens.muted }}
    >
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="agenda">
        <Label>Agenda</Label>
        <Icon sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stats">
        <Label>Stats</Label>
        <Icon sf="chart.bar.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon sf="gearshape.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
