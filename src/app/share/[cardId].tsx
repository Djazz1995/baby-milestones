import { useLocalSearchParams } from 'expo-router';

import { ShareCardScreen } from '@/screens/ShareCardScreen';

/**
 * Share route. The `cardId` segment is a throwaway (cards aren't persisted in
 * v1); the roast `text` + `goalName` ride in as query params.
 */
export default function ShareCardRoute() {
  const { text, goalName, day, streak } = useLocalSearchParams<{
    text: string;
    goalName?: string;
    day?: string;
    streak?: string;
  }>();
  return (
    <ShareCardScreen
      text={text ?? ''}
      goalName={goalName}
      day={day ? Number(day) : undefined}
      streak={streak ? Number(streak) : undefined}
    />
  );
}
