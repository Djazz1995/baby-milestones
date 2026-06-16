/** Accountability buddy link. See AGENTS.md §4.6. */

export type BuddyInviteStatus = 'pending' | 'accepted' | 'declined';

export type Buddy = {
  id: string;
  /** Contact handle the invite was sent to (phone / email / link token). */
  contact: string;
  inviteStatus: BuddyInviteStatus;
};
