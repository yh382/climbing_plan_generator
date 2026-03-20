import { useLocalSearchParams } from 'expo-router';
import GymDetailScreen from '../../src/features/gyms/GymDetailScreen';

export default function GymDetailPage() {
  const { gymId } = useLocalSearchParams<{ gymId: string }>();
  return <GymDetailScreen gymId={gymId!} />;
}
