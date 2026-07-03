import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { Card, PrimaryButton, TextButton } from '@/components/kit';
import { useBuddies } from '@/hooks/use-buddies';
import { buddyService } from '@/services/buddyService';
import type { Buddy } from '@/models';
import { tokens } from '@/theme/tokens';

export function BuddyScreen() {
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
    <ScreenLayout
      edges={['bottom']}
      footer={<PrimaryButton title="Invite a buddy" onPress={onInvite} loading={adding} />}
    >
      <ThemedText type="body" color="muted" style={{ lineHeight: 22, marginTop: 4, marginBottom: 20 }}>
        They see when you show up, and when you bail. Shame works better with an audience.
      </ThemedText>

      <TextInput
        value={contact}
        onChangeText={setContact}
        placeholder="name, phone, or email"
        placeholderTextColor={tokens.muted}
        autoCapitalize="none"
        style={{
          height: 52,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: tokens.rim,
          backgroundColor: tokens.surface,
          paddingHorizontal: 16,
          color: tokens.fg,
          fontSize: 15,
          marginBottom: 20,
        }}
      />

      {error ? (
        <ThemedText type="caption" style={{ color: tokens.danger, marginBottom: 16 }}>
          {error}
        </ThemedText>
      ) : null}

      {loading && data.length === 0 ? null : data.length === 0 ? (
        <ThemedText type="body" color="muted" style={{ marginBottom: 16 }}>
          No buddies yet.
        </ThemedText>
      ) : (
        data.map((b) => (
          <BuddyRow key={b.id} buddy={b} onRemove={() => onRemove(b.id, b.contact)} />
        ))
      )}

      <ThemedText
        type="caption"
        color="muted"
        style={{ lineHeight: 18, marginTop: 12 }}
      >
        Buddies get notified on completions and skips, nothing in between. They don&apos;t see your
        excuses, just the result.
      </ThemedText>
    </ScreenLayout>
  );
}

function BuddyRow({ buddy, onRemove }: { buddy: Buddy; onRemove: () => void }) {
  const initial = (buddy.contact.trim()[0] ?? '?').toUpperCase();
  return (
    <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 12 }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: tokens.surface2,
          borderWidth: 1,
          borderColor: tokens.rim,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ThemedText type="heading">{initial}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="subheading" numberOfLines={1}>
          {buddy.contact}
        </ThemedText>
        <ThemedText type="caption" color="muted" style={{ marginTop: 2 }}>
          {buddy.inviteStatus === 'pending' ? 'invite pending' : 'watching your goals'}
        </ThemedText>
      </View>
      <TextButton title="remove" color={tokens.muted} onPress={onRemove} />
    </Card>
  );
}
