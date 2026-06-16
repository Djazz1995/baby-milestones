import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useBuddies } from '@/hooks/use-buddies';
import { useTheme } from '@/hooks/use-theme';
import { buddyService } from '@/services/buddyService';

export function BuddyScreen() {
  const theme = useTheme();
  const { data, loading, refetch } = useBuddies();
  const [contact, setContact] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();

  async function onInvite() {
    const c = contact.trim();
    if (!c) return;
    setAdding(true);
    setError(undefined);
    try {
      await buddyService.invite(c);
      setContact('');
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  function onRemove(id: string, label: string) {
    Alert.alert('Remove buddy?', `Stop sharing with ${label}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await buddyService.remove(id);
          refetch();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="small" themeColor="textSecondary">
          A buddy gets told when you finish — or bail. Shame works when witnessed.
        </ThemedText>

        <View style={styles.addRow}>
          <TextInput
            value={contact}
            onChangeText={setContact}
            placeholder="name, phone, or email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            style={[
              styles.input,
              { color: theme.text, backgroundColor: theme.backgroundElement, flex: 1 },
            ]}
          />
          <Button title="Invite" variant="secondary" onPress={onInvite} loading={adding} />
        </View>

        {error ? (
          <ThemedText type="small" style={{ color: '#E5484D' }}>
            {error}
          </ThemedText>
        ) : null}

        {loading && data.length === 0 ? null : data.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No buddies yet.
          </ThemedText>
        ) : (
          data.map((b) => (
            <ThemedView key={b.id} type="backgroundElement" style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{b.contact}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {b.inviteStatus}
                </ThemedText>
              </View>
              <Pressable onPress={() => onRemove(b.id, b.contact)} hitSlop={8}>
                <ThemedText type="small" style={{ color: '#E5484D' }}>
                  Remove
                </ThemedText>
              </Pressable>
            </ThemedView>
          ))
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  addRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
});
