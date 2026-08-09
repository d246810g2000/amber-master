import React, { useState, useEffect, useRef } from 'react';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import { cn } from '../../../lib/utils';

export interface TriviaQuestion {
  id: number;
  chapter: number;
  chapterName: string;
  questionCode: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface TriviaGamePlayProps {
  questions: TriviaQuestion[];
  onGameEnd: (score: number, maxCombo: number, correctCount: number, userAnswers: number[]) => void;
  onAnswerSubmit?: (questionId: number, isCorrect: boolean) => void;
}

let audioCtx: AudioContext | null = null;
const playSynthSound = (type: 'gold' | 'hit' | 'tick') => {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'gold') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'tick') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    // Ignore audio
  }
};

export const TriviaGamePlay: React.FC<TriviaGamePlayProps> = ({ questions, onGameEnd, onAnswerSubmit }) => {
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const maxComboRef = useRef<number>(0);
  const nextQuestionScheduledRef = useRef<boolean>(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState<number>(0);
  const [triviaTimer, setTriviaTimer] = useState<number>(15); // 15 seconds per question

  const [questionResults, setQuestionResults] = useState<(boolean | null)[]>([]);
  const [floatingScore, setFloatingScore] = useState<{score: number, id: number} | null>(null);
  const [isShake, setIsShake] = useState(false);
  const floatingIdRef = useRef(0);

  // Initialize question results array
  useEffect(() => {
    if (questions) {
      setQuestionResults(new Array(questions.length).fill(null));
    }
  }, [questions]);

  // Optional: if no questions provided, end game immediately
  useEffect(() => {
    if (!questions || questions.length === 0) {
      onGameEnd(0, 0, 0, []);
    }
  }, [questions]);

  // Option selection
  const handleSelectOption = (optionIndex: number) => {
    if (isAnswered || !questions || questions.length === 0) return;
    setSelectedOptionIndex(optionIndex);
    setIsAnswered(true);

    setUserAnswers(prev => {
      const newArr = [...prev];
      newArr[currentQuestionIndex] = optionIndex;
      return newArr;
    });

    const question = questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.answerIndex;

    // Report answer immediately to backend via callback
    if (onAnswerSubmit && question.id) {
      onAnswerSubmit(question.id, isCorrect);
    }

    if (isCorrect) {
      setCorrectAnswersCount(c => c + 1);
      const newCombo = combo + 1;
      setCombo(newCombo);
      maxComboRef.current = Math.max(maxComboRef.current, newCombo);

      // 100 base feathers per question
      const speedBonus = triviaTimer * 10;
      let comboMultiplier = 1.0;
      if (newCombo === 2) comboMultiplier = 1.1; 
      else if (newCombo === 3) comboMultiplier = 1.2;
      else if (newCombo === 4) comboMultiplier = 1.3;
      else if (newCombo === 5) comboMultiplier = 1.5;

      const points = Math.round((100 + speedBonus) * comboMultiplier);
      setScore(s => s + points);
      playSynthSound('gold');

      floatingIdRef.current += 1;
      setFloatingScore({ score: points, id: floatingIdRef.current });
      setTimeout(() => setFloatingScore(null), 1200);

      setQuestionResults(prev => {
        const newR = [...prev];
        newR[currentQuestionIndex] = true;
        return newR;
      });
    } else {
      setCombo(0);
      playSynthSound('hit');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 400);

      setQuestionResults(prev => {
        const newR = [...prev];
        newR[currentQuestionIndex] = false;
        return newR;
      });
    }
  };

  // Timer Tick
  useEffect(() => {
    if (!questions || questions.length === 0) return;
    const timer = setInterval(() => {
      setTriviaTimer((prev) => {
        if (prev <= 4 && prev > 1 && !isAnswered) {
          playSynthSound('tick');
        }
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex, questions, isAnswered]);

  useEffect(() => {
    if (triviaTimer === 0 && !nextQuestionScheduledRef.current) {
      nextQuestionScheduledRef.current = true;
      if (!isAnswered) {
        handleSelectOption(-1);
        setTimeout(() => {
          handleNextQuestion();
        }, 1500);
      } else {
        handleNextQuestion();
      }
    }
  }, [triviaTimer, isAnswered]);

  const handleNextQuestion = () => {
    if (!questions || questions.length === 0) return;
    nextQuestionScheduledRef.current = false;
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionIndex(null);
      setIsAnswered(false);
      setTriviaTimer(15);
    } else {
      // Calculate Perfect Bonus (+100)
      let finalScore = score;
      if (correctAnswersCount + (selectedOptionIndex === questions[currentQuestionIndex].answerIndex ? 1 : 0) === questions.length) {
        finalScore += 100;
      }
      onGameEnd(finalScore, maxComboRef.current, correctAnswersCount, userAnswers);
    }
  };

  if (!questions || questions.length === 0) {
    return <div className="p-6 text-center text-white">載入題目中...</div>;
  }

  const currentQ = questions[currentQuestionIndex];

  return (
    <div className="p-6 flex flex-col justify-between h-[450px] bg-slate-950 text-white select-none relative overflow-hidden">
      <style>{`
        @keyframes combo-pop {
          0% { transform: scale(0.9); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1.0); }
        }
        .animate-combo-pop {
          animation: combo-pop 0.22s ease-out forwards;
          display: inline-block;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes float-up {
          0% { opacity: 0; transform: translateY(10px) scale(0.8); }
          20% { opacity: 1; transform: translateY(-5px) scale(1.1); }
          80% { opacity: 1; transform: translateY(-15px) scale(1); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.9); }
        }
        .animate-float-up {
          animation: float-up 1s ease-out forwards;
        }
      `}</style>

      {/* Top Overlay */}
      <div className="flex flex-col gap-2 mb-2">
        <div className="flex justify-between items-center bg-slate-900/95 px-4 py-2 rounded-2xl border border-slate-800/60 shadow-lg text-sm select-none relative overflow-hidden">
          {/* Progress Bar Background */}
          <div 
            className={cn(
              "absolute bottom-0 left-0 h-0.5 transition-all duration-1000 ease-linear",
              triviaTimer <= 3 ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
            )}
            style={{ width: `${(triviaTimer / 15) * 100}%` }}
          />

          <div className="flex items-center gap-1.5 font-black text-amber-400 z-10">
            <span className="text-base">🏆</span>
            <span className="text-base tracking-wider tabular-nums">{score}</span>
          </div>

          <div className="text-[10px] font-black text-slate-400 text-center flex flex-col z-10">
            <span>{currentQ.chapterName}</span>
            <div className="flex gap-1 justify-center mt-0.5">
              {questionResults.map((res, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    res === true ? "bg-emerald-400 shadow-[0_0_4px_#34d399]" : 
                    res === false ? "bg-red-500 shadow-[0_0_4px_#ef4444]" : 
                    i === currentQuestionIndex ? "bg-amber-400 animate-pulse" : "bg-slate-700"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-black z-10">
            <span className="text-base text-white">⏱️</span>
            <span className={cn(
              "text-sm tracking-wider tabular-nums",
              triviaTimer <= 3 ? "text-red-500 animate-pulse" : "text-white"
            )}>
              {triviaTimer}s
            </span>
          </div>
        </div>
      </div>

      {/* Question area */}
      <div className={cn("flex-1 mb-2 mt-1 flex flex-col justify-center space-y-3", isShake && "animate-shake")}>
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl text-center relative">
          <p className="text-[13px] md:text-sm font-extrabold leading-snug text-white">
            {currentQ.question}
          </p>
          
          {/* Floating Score */}
          {floatingScore && (
            <div key={floatingScore.id} className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none z-50">
              <span className="text-amber-400 font-black text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-float-up inline-block">
                +{floatingScore.score}
              </span>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-2">
          {currentQ.options.map((option, idx) => {
            const isCorrectAnswer = idx === currentQ.answerIndex;
            const isSelected = idx === selectedOptionIndex;
            
            let optionClass = "bg-slate-900/80 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200";
            let showCheck = false;
            let showCross = false;
            
            if (isAnswered) {
              if (isSelected && isCorrectAnswer) {
                optionClass = "bg-emerald-950/60 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)] text-emerald-400 font-extrabold z-10 scale-[1.02]";
                showCheck = true;
              } else if (isSelected && !isCorrectAnswer) {
                optionClass = "bg-red-950/60 border-red-500 text-red-400 font-extrabold";
                showCross = true;
              } else {
                optionClass = "opacity-40 bg-slate-900/20 border-slate-900 text-slate-600";
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={cn(
                  "w-full text-left py-2.5 px-4 rounded-xl border text-xs transition-all duration-200 font-bold active:scale-95 flex items-center justify-between",
                  optionClass
                )}
              >
                <span className="line-clamp-2 leading-relaxed tracking-wide">{idx + 1}. {option}</span>
                {showCheck && <span className="text-emerald-400 font-black ml-2 shrink-0 text-base">✓</span>}
                {showCross && <span className="text-red-400 font-black ml-2 shrink-0 text-base">✗</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Area */}
      <div className="h-16 flex items-center justify-between gap-3 border-t border-slate-900 pt-2 shrink-0">
        <div className="flex-1 overflow-y-auto pr-1 h-full flex items-center">
          {isAnswered ? (
            selectedOptionIndex === currentQ.answerIndex ? (
              <p className="text-[10px] text-emerald-400 font-semibold leading-tight">
                💡 說明：{currentQ.explanation}
              </p>
            ) : (
              <p className="text-[10px] text-red-400 font-semibold leading-tight animate-pulse">
                ❌ 答錯了，正確解答請在下次挑戰中答對解鎖！
              </p>
            )
          ) : combo > 0 ? (
            <span className="text-xs bg-amber-950/60 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-black animate-combo-pop">
              🔥 {combo} 連擊中！
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-semibold bg-slate-900 px-2 py-1 rounded-lg">答題越快，分數加成越高！⚡</span>
          )}
        </div>
      </div>
    </div>
  );
};
