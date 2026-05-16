import { useTrainingSync } from '../hooks/useTrainingSync';
import { useRunAdvisorProfile } from '../context/RunAdvisorProfileContext';

function TrainingSyncManager({ enabled }) {
  const { profile, refreshProfile } = useRunAdvisorProfile();

  useTrainingSync({
    enabled,
    stravaConnected: Boolean(profile?.stravaId),
    onSynced: () => refreshProfile()
  });

  return null;
}

export default TrainingSyncManager;
