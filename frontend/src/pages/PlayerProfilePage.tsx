import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayerProfile } from '../components/PlayerProfile';
import { useCourtSync } from '../hooks/useCourtSync';
import { getTaipeiDateString } from '../lib/utils';

export function PlayerProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { playerId = '' } = useParams();

  /** 球員頁不在 Dashboard：仍要輪詢 CourtState，賽後 bump 版號時刷新戰力／對戰／快照 */
  const { syncState, isSyncInitialized } = useCourtSync({
    pollingInterval: 3000,
    enabled: true,
    targetDate: getTaipeiDateString(),
  });

  React.useEffect(() => {
    if (syncState.version <= 0 || !isSyncInitialized) return;
    void queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['players-base'] });
    void queryClient.invalidateQueries({ queryKey: ['playerStats'] });
  }, [syncState.version, isSyncInitialized, queryClient]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-white transition-colors duration-500 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <PlayerProfile
          playerId={playerId}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}

