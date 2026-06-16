/** User profile + global defaults. See AGENTS.md §7.2, §12. */

import type { EscalationSpeed, RudenessLevel } from './goal';

export type UserTier = 'free' | 'paid';

export type NotificationSound = 'standard' | 'whistle' | 'foghorn' | 'silent';

/** Global defaults applied to new goals + app-wide behavior (§7.2). */
export type UserDefaults = {
  rudenessLevel: RudenessLevel;
  escalationSpeed: EscalationSpeed;
  /** Local "HH:mm" window during which no notifications fire. */
  quietHoursStart?: string;
  quietHoursEnd?: string;
  sound: NotificationSound;
  /** Always watermark shared cards (§7.2). */
  alwaysWatermark: boolean;
};

export type User = {
  id: string;
  defaults: UserDefaults;
  tier: UserTier;
  createdAt: string;
};
