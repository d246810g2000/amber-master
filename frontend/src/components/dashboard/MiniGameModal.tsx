import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import * as gasApi from '../../lib/gasApi';
import { useAuth } from '../../context/AuthContext';
import { FeatherGameCanvas, GameFeatherIcon } from './minigame/FeatherGameCanvas';
import { TriviaGamePlay } from './minigame/TriviaGamePlay';
import { GameLobby } from './minigame/GameLobby';
import { FeatherGameMenu } from './minigame/FeatherGameMenu';
import { TriviaGameMenu } from './minigame/TriviaGameMenu';
import { FeatherGameEnded } from './minigame/FeatherGameEnded';
import { TriviaGameEnded } from './minigame/TriviaGameEnded';
import { FeatherRushMenu } from './minigame/FeatherRushMenu';
import { FeatherRushCanvas } from './minigame/FeatherRushCanvas';
import { FeatherRushEnded } from './minigame/FeatherRushEnded';
import { RoomLobbyModal } from './minigame/RoomLobbyModal';
import { MiniGameType } from './minigame/types';

interface MiniGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName?: string;
  playerAvatar?: string;
  playerId?: string;
  onSuccess?: () => void;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
  isOpen,
  onClose,
  playerName = '球員',
  playerAvatar = '',
  playerId,
  onSuccess,
}) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // API Eligibility Check
  const { data: eligibility, refetch: refetchEligibility } = useQuery({
    queryKey: ['minigameStatus', currentUser?.email],
    queryFn: () => gasApi.fetchMiniGameStatus(currentUser?.email || ''),
    enabled: isOpen && !!currentUser?.email,
  });

  // Query weekly claim status
  const { data: weeklyClaimStatus, refetch: refetchWeeklyClaimStatus } = useQuery({
    queryKey: ['minigameWeeklyClaimStatus', currentUser?.email],
    queryFn: () => gasApi.fetchMiniGameWeeklyClaimStatus(currentUser?.email || ''),
    enabled: isOpen && !!currentUser?.email,
  });

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const handleClaimWeeklyScore = async (gameType: string) => {
    if (!currentUser?.email) return;
    setIsClaiming(true);
    setClaimResult(null);
    try {
      const res = await gasApi.claimMiniGameWeeklyScore(currentUser.email, gameType);
      setClaimResult({ status: 'success', message: res.message });
      refetchWeeklyClaimStatus();
      if (onSuccess) onSuccess();
    } catch (e: any) {
      setClaimResult({ status: 'error', message: e.message || "兌換失敗，請重試" });
    } finally {
      setIsClaiming(false);
    }
  };

  // Leaderboard Query
  const { data: leaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['minigameLeaderboard'],
    queryFn: () => gasApi.fetchMiniGameLeaderboard(),
    enabled: isOpen,
  });

  // Screen & Game Type States
  const [currentScreen, setCurrentScreen] = useState<'lobby' | 'feather_menu' | 'trivia_menu' | 'feather_rush_menu'>('lobby');
  const [gameType, setGameType] = useState<MiniGameType>('feather');

  // Game States
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [score, setScore] = useState<number>(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const maxComboRef = useRef<number>(0);

  // Wager Match States
  const [isRoomLobbyOpen, setIsRoomLobbyOpen] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isWagerMatch, setIsWagerMatch] = useState<boolean>(false);
  const [roomWagerAmount, setRoomWagerAmount] = useState<number>(0);
  const [roomIsHost, setRoomIsHost] = useState<boolean>(false);

  // Trivia States
  const [triviaQuestions, setTriviaQuestions] = useState<any[]>([]);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentScreen('lobby');
      setGameState('idle');
      setSubmitResult(null);
      setScore(0);
      setCorrectAnswersCount(0);
      maxComboRef.current = 0;
      setRoomCode(null);
      setIsWagerMatch(false);
      setRoomWagerAmount(0);
      setRoomIsHost(false);
      setIsRoomLobbyOpen(false);
      setTriviaQuestions([]);
      setClaimResult(null);
    }
  }, [isOpen]);

  const startFeatherRushGame = () => {
    setScore(0);
    maxComboRef.current = 0;
    setGameState('playing');
    setSubmitResult(null);
  };

  const startGame = () => {
    setScore(0);
    maxComboRef.current = 0;
    setGameState('playing');
    setSubmitResult(null);
  };

  const startTriviaGame = async () => {
    try {
      const questions = await gasApi.fetchTriviaQuestions(currentUser?.email, 6);
      setTriviaQuestions(questions);
    } catch (err) {
      console.error("Failed to load trivia questions", err);
      // fallback or error handling
    }
    setScore(0);
    maxComboRef.current = 0;
    setCorrectAnswersCount(0);
    setGameState('playing');
  };

  // Callback to start the game directly from room waiting lobby
  const handleStartRoomGame = async (code: string, type: MiniGameType, wager: number, isHost: boolean) => {
    if (type === 'trivia') {
      try {
        const questions = await gasApi.fetchRoomTriviaQuestions(code);
        setTriviaQuestions(questions);
      } catch (err) {
        console.error("Failed to load room trivia questions", err);
      }
    }

    setRoomCode(code);
    setIsWagerMatch(true);
    setRoomWagerAmount(wager);
    setRoomIsHost(isHost);
    setGameType(type);
    setScore(0);
    maxComboRef.current = 0;
    setCorrectAnswersCount(0);
    setGameState('playing');
    setSubmitResult(null);
  };

  const handleTriviaAnswerSubmit = async (questionId: number, isCorrect: boolean) => {
    if (!currentUser?.email) return;
    try {
      await gasApi.submitTriviaAnswer(currentUser.email, questionId, isCorrect);
    } catch (e) {
      console.error("Failed to submit trivia answer", e);
    }
  };

  // Submit the score to server
  const handleSubmitScore = async () => {
    if (!currentUser?.email) return;
    setIsSubmitting(true);
    try {
      let res;
      if (isWagerMatch && roomCode) {
        // Submit score to 1v1 wager room
        const roomRes = await gasApi.submitMiniGameRoomScore(roomCode, currentUser.email, score);
        if (roomRes.settled) {
          // Fetch room details to set roomIsHost correctly based on room host_player_name vs currentUser.name
          try {
            const room = await gasApi.fetchMiniGameRoom(roomCode);
            if (room) {
              setRoomIsHost(room.host_player_name === currentUser?.name);
            }
          } catch (e) {
            console.error("Failed to fetch room details for isHost detection", e);
          }

          res = {
            status: 'success',
            settled: true,
            winner: roomRes.winner,
            host_score: roomRes.host_score,
            guest_score: roomRes.guest_score,
            message: `對戰完成！贏家是：${roomRes.winner} (您: ${score} 分 | 對手: ${
              roomIsHost ? roomRes.guest_score : roomRes.host_score
            } 分)`
          };
        } else {
          res = {
            status: 'success',
            settled: false,
            message: '已成功送出成績，等待對手完成中...'
          };
        }
      } else {
        // Standard single-player weekly submission
        res = await gasApi.submitMiniGameScore(currentUser.email, score, maxComboRef.current, gameType);
      }
      
      setSubmitResult(res);
      refetchEligibility();
      refetchLeaderboard();
      refetchWeeklyClaimStatus();
      queryClient.invalidateQueries({ queryKey: ['activeMiniGameRooms'] });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitResult({ status: 'error', message: err.message || '連線錯誤' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-submit score when game ends for wager match
  useEffect(() => {
    if (gameState === 'ended' && isWagerMatch && !isSubmitting && !submitResult) {
      handleSubmitScore();
    }
  }, [gameState, isWagerMatch, isSubmitting, submitResult]);

  // Poll room status if score submitted but match is not yet settled
  useEffect(() => {
    let intervalId: any = null;
    if (isWagerMatch && roomCode && submitResult && submitResult.settled === false) {
      intervalId = setInterval(async () => {
        try {
          const room = await gasApi.fetchMiniGameRoom(roomCode);
          if (room && (room.status === 'finished' || (room.match && room.match.host_submitted && room.match.guest_submitted))) {
            clearInterval(intervalId);
            
            const hostScore = room.match?.host_score ?? 0;
            const guestScore = room.match?.guest_score ?? 0;
            
            // Set roomIsHost dynamically based on room details
            const isHost = room.host_player_name === currentUser?.name;
            setRoomIsHost(isHost);

            let winnerName = "平手";
            if (hostScore > guestScore) {
              winnerName = room.host_player_name || "Host";
            } else if (guestScore > hostScore) {
              winnerName = room.guest_player_name || "Guest";
            }
            
            setSubmitResult({
              status: 'success',
              settled: true,
              winner: winnerName,
              host_score: hostScore,
              guest_score: guestScore,
              message: '對戰完成！'
            });
            
            refetchEligibility();
            refetchLeaderboard();
            queryClient.invalidateQueries({ queryKey: ['activeMiniGameRooms'] });
            if (onSuccess) onSuccess();
          }
        } catch (err) {
          console.error("Error polling wager room settlement:", err);
        }
      }, 1500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isWagerMatch, roomCode, submitResult, currentUser]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => gameState === 'idle' && onClose()}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                {currentScreen !== 'lobby' && gameState === 'idle' ? (
                  <button
                    onClick={() => setCurrentScreen('lobby')}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors mr-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : currentScreen === 'lobby' ? (
                  <span className="text-xl">🎮</span>
                ) : gameType === 'feather' ? (
                  <GameFeatherIcon color="#38bdf8" glow={true} className="w-5 h-6" />
                ) : gameType === 'feather_rush' ? (
                  <span className="text-lg">🚀</span>
                ) : (
                  <Lightbulb className="w-5 h-5 text-amber-400" style={{ filter: 'drop-shadow(0 0 4px #fbbf24)' }} />
                )}
                <h3 className="text-base md:text-lg font-black tracking-wide bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                  {currentScreen === 'lobby'
                    ? "安柏羽球社 遊戲大廳"
                    : currentScreen === 'feather_menu' || gameType === 'feather'
                    ? "每週接羽毛挑戰小遊戲"
                    : currentScreen === 'feather_rush_menu' || gameType === 'feather_rush'
                    ? "飛羽衝鋒"
                    : "羽球小學堂智力挑戰"}
                </h3>
              </div>
              {gameState !== 'playing' && (
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content Area */}
            <div className="relative flex-1 min-h-[500px] flex flex-col justify-center bg-slate-950 overflow-hidden">
              
              {/* 1. IDLE STATE VIEW */}
              {gameState === 'idle' && (
                <>
                  {currentScreen === 'lobby' && (
                    <GameLobby
                      playerName={playerName}
                      featherHighScore={leaderboard?.feather?.allTime?.find((item: any) => item.name === playerName)?.score || leaderboard?.allTime?.find((item: any) => item.name === playerName)?.score || 0}
                      triviaHighScore={leaderboard?.trivia?.allTime?.find((item: any) => item.name === playerName)?.score || 0}
                      featherRushHighScore={leaderboard?.feather_rush?.allTime?.find((item: any) => item.name === playerName)?.score || 0}
                      weeklyClaimStatus={weeklyClaimStatus}
                      isClaiming={isClaiming}
                      onClaimWeeklyScore={handleClaimWeeklyScore}
                      claimResult={claimResult}
                      onSelectFeather={() => {
                        setGameType('feather');
                        setCurrentScreen('feather_menu');
                      }}
                      onSelectTrivia={() => {
                        setGameType('trivia');
                        setCurrentScreen('trivia_menu');
                      }}
                      onSelectFeatherRush={() => {
                        setGameType('feather_rush');
                        setCurrentScreen('feather_rush_menu');
                      }}
                      onOpenWagerRooms={() => setIsRoomLobbyOpen(true)}
                    />
                  )}

                  {currentScreen === 'feather_menu' && (
                    <FeatherGameMenu
                      leaderboard={leaderboard}
                      playerName={playerName}
                      eligibility={eligibility}
                      onStartGame={startGame}
                    />
                  )}

                  {currentScreen === 'trivia_menu' && (
                    <TriviaGameMenu
                      leaderboard={leaderboard}
                      playerName={playerName}
                      playerEmail={currentUser?.email || ''}
                      eligibility={eligibility}
                      onStartGame={startTriviaGame}
                    />
                  )}

                  {currentScreen === 'feather_rush_menu' && (
                    <FeatherRushMenu
                      leaderboard={leaderboard}
                      playerName={playerName}
                      eligibility={eligibility}
                      onStartGame={startFeatherRushGame}
                    />
                  )}
                </>
              )}

              {/* 2. PLAYING STATE VIEW */}
              {gameState === 'playing' && (
                <>
                  {gameType === 'feather' && (
                    <FeatherGameCanvas
                      playerName={playerName}
                      playerAvatar={playerAvatar}
                      onGameEnd={(finalScore, maxCombo) => {
                        setScore(finalScore);
                        maxComboRef.current = maxCombo;
                        setGameState('ended');
                      }}
                    />
                  )}

                  {gameType === 'trivia' && (
                    <TriviaGamePlay
                      questions={triviaQuestions}
                      onAnswerSubmit={handleTriviaAnswerSubmit}
                      onGameEnd={(finalScore, maxCombo, correctCount, answers) => {
                        setScore(finalScore);
                        maxComboRef.current = maxCombo;
                        setCorrectAnswersCount(correctCount);
                        setUserAnswers(answers);
                        setGameState('ended');
                      }}
                    />
                  )}

                  {gameType === 'feather_rush' && (
                    <FeatherRushCanvas
                      playerName={playerName}
                      playerAvatar={playerAvatar}
                      onGameEnd={(finalScore, maxCombo) => {
                        setScore(finalScore);
                        maxComboRef.current = maxCombo;
                        setGameState('ended');
                      }}
                    />
                  )}
                </>
              )}

              {/* 3. ENDED STATE VIEW */}
              {gameState === 'ended' && (
                <>
                  {!isWagerMatch && gameType === 'feather' && (
                    <FeatherGameEnded
                      score={score}
                      isSubmitting={isSubmitting}
                      submitResult={submitResult}
                      canEarnReward={false}
                      nextReset={eligibility?.nextReset}
                      onSubmit={handleSubmitScore}
                      onClose={onClose}
                      onReturnToLobby={() => {
                        setGameState('idle');
                        setCurrentScreen('lobby');
                      }}
                    />
                  )}

                  {!isWagerMatch && gameType === 'trivia' && (
                    <TriviaGameEnded
                      score={score}
                      correctAnswersCount={correctAnswersCount}
                      totalQuestions={triviaQuestions.length}
                      questions={triviaQuestions}
                      userAnswers={userAnswers}
                      maxCombo={maxComboRef.current}
                      isSubmitting={isSubmitting}
                      submitResult={submitResult}
                      canEarnReward={false}
                      nextReset={eligibility?.nextReset}
                      onSubmit={handleSubmitScore}
                      onReturnToLobby={() => {
                        setGameState('idle');
                        setCurrentScreen('lobby');
                      }}
                    />
                  )}

                  {!isWagerMatch && gameType === 'feather_rush' && (
                    <FeatherRushEnded
                      score={score}
                      maxCombo={maxComboRef.current}
                      isSubmitting={isSubmitting}
                      submitResult={submitResult}
                      nextReset={eligibility?.nextReset}
                      onSubmit={handleSubmitScore}
                      onClose={onClose}
                      onReturnToLobby={() => {
                        setGameState('idle');
                        setCurrentScreen('lobby');
                      }}
                    />
                  )}

                  {isWagerMatch && gameType === 'feather_rush' && (
                    <FeatherRushEnded
                      score={score}
                      maxCombo={maxComboRef.current}
                      isSubmitting={isSubmitting}
                      submitResult={submitResult}
                      isWagerMatch={true}
                      roomIsHost={roomIsHost}
                      wagerAmount={roomWagerAmount}
                      currentUserName={currentUser?.name}
                      onSubmit={handleSubmitScore}
                      onClose={onClose}
                      onReturnToLobby={() => {
                        setGameState('idle');
                        setCurrentScreen('lobby');
                        setIsWagerMatch(false);
                        setRoomCode(null);
                        queryClient.invalidateQueries({ queryKey: ['activeMiniGameRooms'] });
                      }}
                    />
                  )}

                  {isWagerMatch && gameType !== 'feather_rush' && (
                    <FeatherGameEnded
                      score={score}
                      isSubmitting={isSubmitting}
                      submitResult={submitResult}
                      canEarnReward={false}
                      isWagerMatch={true}
                      roomIsHost={roomIsHost}
                      wagerAmount={roomWagerAmount}
                      currentUserName={currentUser?.name}
                      onSubmit={handleSubmitScore}
                      onClose={onClose}
                      onReturnToLobby={() => {
                        setGameState('idle');
                        setCurrentScreen('lobby');
                        setIsWagerMatch(false);
                        setRoomCode(null);
                        queryClient.invalidateQueries({ queryKey: ['activeMiniGameRooms'] });
                      }}
                    />
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Room Lobby Wager Matching Modal overlay */}
      <RoomLobbyModal
        isOpen={isRoomLobbyOpen && isOpen}
        onClose={() => setIsRoomLobbyOpen(false)}
        playerName={playerName}
        playerEmail={currentUser?.email || ''}
        playerId={playerId}
        onSelectGame={handleStartRoomGame}
      />
    </AnimatePresence>
  );
};
