import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayerProfile } from '../components/PlayerProfile';

export function PlayerProfilePage() {
  const navigate = useNavigate();
  const { playerId = '' } = useParams();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <PlayerProfile
          playerId={playerId}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}

