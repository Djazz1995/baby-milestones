import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/kit/card';
import { tokens, tint } from '@/theme/tokens';

export type CellState = 'done' | 'skipped' | 'off' | 'missed' | 'none';

export type GridRow = { label: string; cells: CellState[] };

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const LABEL_W = 76;

function cell(state: CellState) {
  switch (state) {
    case 'done':
      return { backgroundColor: tokens.success };
    case 'skipped':
      return { backgroundColor: tokens.danger };
    case 'off':
      return { backgroundColor: tokens.off, opacity: 0.32 };
    case 'missed':
      return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: tokens.muted };
    default:
      return { backgroundColor: 'transparent' };
  }
}

/**
 * The weekly heatmap (Stats). One row per goal, 7 day cells, plus a legend.
 * Reads the same done/skipped/off/missed status vocabulary as the rest of the app.
 */
export function ConsistencyGrid({ rows }: { rows: GridRow[] }) {
  return (
    <Card>
      {/* header */}
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <View style={{ width: LABEL_W }} />
        {DOW.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <ThemedText type="caption" style={{ fontSize: 10, fontWeight: '600' }} color="muted">
              {d}
            </ThemedText>
          </View>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View
          key={ri}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: ri === rows.length - 1 ? 0 : 8 }}
        >
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ width: LABEL_W, paddingRight: 6, fontSize: 12.5, fontWeight: '600' }}
          >
            {row.label}
          </ThemedText>
          {row.cells.map((c, ci) => (
            <View key={ci} style={{ flex: 1, alignItems: 'center' }}>
              <View style={[{ width: 22, height: 22, borderRadius: 6 }, cell(c)]} />
            </View>
          ))}
        </View>
      ))}

      {/* legend */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 14,
          marginTop: 14,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: tokens.rim,
        }}
      >
        <LegendItem style={{ backgroundColor: tokens.success }} label="Done" />
        <LegendItem style={{ backgroundColor: tokens.danger }} label="Skipped" />
        <LegendItem style={{ backgroundColor: tint(tokens.off, 0.5) }} label="Not scheduled" />
        <LegendItem
          style={{ backgroundColor: 'transparent', borderWidth: 1.5, borderColor: tokens.muted }}
          label="Missed"
        />
      </View>
    </Card>
  );
}

function LegendItem({ style, label }: { style: object; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={[{ width: 10, height: 10, borderRadius: 3 }, style]} />
      <ThemedText type="caption" style={{ fontSize: 11.5 }} color="muted">
        {label}
      </ThemedText>
    </View>
  );
}
