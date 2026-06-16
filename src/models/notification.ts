/** Push payload + deep-link target. See AGENTS.md §4.2. */

export type NotificationPayload = {
  goalId: string;
  /** Escalation wave this notification represents. */
  wave: number;
  /** Pre-baked, personalized copy shown in the notification. */
  body: string;
  /** Deep link the tap routes to, e.g. "/goal/<id>/complete". */
  deepLink: string;
};
