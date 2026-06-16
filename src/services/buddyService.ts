/** Accountability buddy CRUD. AGENTS.md §4.6, §15.3. */

import { getUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Buddy, BuddyInviteStatus } from '@/models';

type BuddyRow = {
  id: string;
  user_id: string;
  contact: string;
  invite_status: BuddyInviteStatus;
  created_at: string;
};

function mapBuddy(row: BuddyRow): Buddy {
  return { id: row.id, contact: row.contact, inviteStatus: row.invite_status };
}

export const buddyService = {
  async list(): Promise<Buddy[]> {
    const { data, error } = await supabase
      .from('buddies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as BuddyRow[]).map(mapBuddy);
  },

  async invite(contact: string): Promise<Buddy> {
    const userId = await getUserId();
    if (!userId) throw new Error('Not signed in.');
    const { data, error } = await supabase
      .from('buddies')
      .insert({ user_id: userId, contact, invite_status: 'pending' })
      .select()
      .single();
    if (error) throw error;
    return mapBuddy(data as BuddyRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('buddies').delete().eq('id', id);
    if (error) throw error;
  },
};
