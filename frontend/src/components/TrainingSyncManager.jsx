import { useTrainingSync } from '../hooks/useTrainingSync';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';

function TrainingSyncManager({ enabled }) {
  const { profile, refreshProfile } = useRunAdvisorProfile();
  const backgroundSyncEnabled = profile?.consent?.notifications?.stravaBackgroundSync !== false;

  useTrainingSync({
    enabled,
    stravaConnected: Boolean(profile?.stravaId),
    backgroundSyncEnabled,
    onSynced: () => refreshProfile()
  });

  return null;
}

export default TrainingSyncManager;
