import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { ScreenLayout } from '@/components/screen-layout';
import { ThemedText } from '@/components/themed-text';
import { Card, GhostButton, TextButton } from '@/components/kit';
import { useCollections } from '@/hooks/use-collections';
import { collectionService } from '@/services/collectionService';
import { tokens } from '@/theme/tokens';

export function CollectionsScreen() {
  const { data, loading, refetch } = useCollections();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [editDraft, setEditDraft] = useState('');

  const inputStyle = {
    color: tokens.fg,
    backgroundColor: tokens.surface2,
    borderWidth: 1,
    borderColor: tokens.rim,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  } as const;

  async function onCreate() {
    const v = name.trim();
    if (!v) return;
    setAdding(true);
    setError(undefined);
    try {
      await collectionService.create(v);
      setName('');
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(id: string, current: string) {
    setEditingId(id);
    setEditDraft(current);
  }

  async function saveEdit(id: string) {
    const v = editDraft.trim();
    setEditingId(undefined);
    if (!v) return;
    try {
      await collectionService.rename(id, v);
      await refetch();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function onRemove(id: string, label: string) {
    Alert.alert('Delete collection?', `“${label}” is removed; its goals stay, just ungrouped.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await collectionService.remove(id);
          refetch();
        },
      },
    ]);
  }

  return (
    <ScreenLayout edges={['bottom']}>
      <ThemedText type="body" color="muted" style={{ marginTop: 8 }}>
        Group goals under a bigger ambition, e.g. “Run a marathon”. Deleting one keeps its goals.
      </ThemedText>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 18 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={onCreate}
          placeholder="New collection"
          placeholderTextColor={tokens.muted}
          returnKeyType="done"
          style={[inputStyle, { flex: 1 }]}
        />
        <View style={{ width: 96 }}>
          <GhostButton title="Add" onPress={onCreate} loading={adding} />
        </View>
      </View>

      {error ? (
        <ThemedText type="caption" color="danger" style={{ marginTop: 12 }}>
          {error}
        </ThemedText>
      ) : null}

      {loading && data.length === 0 ? null : data.length === 0 ? (
        <ThemedText type="body" color="muted" style={{ marginTop: 24, textAlign: 'center' }}>
          No collections yet.
        </ThemedText>
      ) : (
        <View style={{ gap: 10, marginTop: 18 }}>
          {data.map((c) => (
            <Card key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {editingId === c.id ? (
                <TextInput
                  value={editDraft}
                  onChangeText={setEditDraft}
                  onSubmitEditing={() => saveEdit(c.id)}
                  onBlur={() => saveEdit(c.id)}
                  autoFocus
                  returnKeyType="done"
                  style={[inputStyle, { flex: 1 }]}
                />
              ) : (
                <Pressable style={{ flex: 1 }} onPress={() => startEdit(c.id, c.name)}>
                  <ThemedText type="bodyStrong">{c.name}</ThemedText>
                  <ThemedText type="caption" color="muted" style={{ marginTop: 2 }}>
                    Tap to rename
                  </ThemedText>
                </Pressable>
              )}
              <TextButton title="Delete" color={tokens.danger} onPress={() => onRemove(c.id, c.name)} />
            </Card>
          ))}
        </View>
      )}
    </ScreenLayout>
  );
}
