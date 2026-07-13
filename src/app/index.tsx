import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';

/**
 * Placeholder home. The RoastMode app has been stripped out; build the Baby
 * Milestones timeline here per PRD.md §6.2 + ARCHITECTURE.md §8.
 */
export default function Home() {
  return (
    <ScreenLayout>
      <ThemedText type="hero" style={{ fontSize: 32 }}>
        Baby Milestones
      </ThemedText>
      <ThemedText type="body" color="muted" style={{ marginTop: 12 }}>
        Clean slate. Start the timeline here.
      </ThemedText>
    </ScreenLayout>
  );
}
