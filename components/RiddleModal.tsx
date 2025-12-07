import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Info, PartyPopper } from 'lucide-react';
import { Riddle } from '../types';

interface RiddleModalProps {
  day: number;
  riddle: Riddle | null;
  isLoading: boolean;
  onClose: () => void;
  onSolved: () => void;
}

// Helper: Levenshtein Distance for fuzzy string matching
const getLevenshteinDistance = (a: string, b: string): number => {
  if (!a) return b ? b.length : 0;
  if (!b) return a ? a.length : 0;

  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1  // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const isFuzzyMatch = (user: string, correct: string): boolean => {
  if (!user || !correct) return false;
  // Normalize: trim, lowercase, remove punctuation
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?:;'"-]/g, '');
  
  const a = normalize(user);
  const b = normalize(correct);
  
  if (a === b) return true;
  
  const dist = getLevenshteinDistance(a, b);
  const len = Math.max(a.length, b.length);
  
  // Tolerance rules:
  // Short words (<= 3 chars): Must be exact
  // Medium words (4-7 chars): 1 error allowed
  // Long words (> 7 chars): 2 errors allowed
  if (len <= 3) return dist === 0;
  if (len <= 7) return dist <= 1;
  return dist <= 2;
};

export const RiddleModal: React.FC<RiddleModalProps> = ({ day, riddle, isLoading, onClose, onSolved }) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [hintClicks, setHintClicks] = useState(0);
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [forceShowSolution, setForceShowSolution] = useState(false);

  useEffect(() => {
    // Reset state when modal opens for a new day
    setUserAnswer('');
    setHintClicks(0);
    setShowError(false);
    setShowSuccess(false);
    setForceShowSolution(false);
  }, [day]);

  const handleHintClick = () => {
    const newCount = hintClicks + 1;
    setHintClicks(newCount);
    
    // Logic: Click 1->Hint1, Click 2->Hint2, Click 3->Hint3, Click 4->Solution
    if (newCount >= 4) {
      setForceShowSolution(true);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!riddle) return;

    let isCorrect = false;

    if (riddle.type === 'choice') {
      isCorrect = userAnswer === riddle.correctAnswer;
    } else {
      // Fuzzy check for text answers
      if (isFuzzyMatch(userAnswer, riddle.correctAnswer)) {
        isCorrect = true;
      } else if (riddle.acceptedAnswers && Array.isArray(riddle.acceptedAnswers) && riddle.acceptedAnswers.length > 0) {
        // Check also against alternative accepted answers
        isCorrect = riddle.acceptedAnswers.some(ans => isFuzzyMatch(userAnswer, ans));
      }
    }

    if (isCorrect) {
      setShowSuccess(true);
      setTimeout(() => {
        onSolved();
      }, 2000); // Wait 2s to show success message before closing/marking solved
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
  };

  if (!riddle && !isLoading) return null;

  // Determine button label text
  let hintButtonText = "";
  if (hintClicks === 0) hintButtonText = "1. Hinweis";
  else if (hintClicks === 1) hintButtonText = "2. Hinweis";
  else if (hintClicks === 2) hintButtonText = "3. Hinweis";
  else hintButtonText = "Lösung anzeigen";

  if (forceShowSolution) hintButtonText = "Lösung angezeigt";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border-4 border-yellow-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-red-800 p-4 flex justify-between items-center border-b-2 border-yellow-600 z-10">
          <h2 className="text-2xl font-christmas font-bold text-yellow-100">
            {day}. Dezember
          </h2>
          <button onClick={onClose} className="text-yellow-200 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-yellow-200 animate-pulse">Der Wichtel malt das Rätsel...</p>
            </div>
          ) : riddle ? (
            <div className="space-y-6">
              {showSuccess ? (
                 <div className="flex flex-col items-center justify-center py-8 text-center animate-in zoom-in duration-300">
                   <div className="bg-green-100 rounded-full p-4 mb-4">
                     <PartyPopper className="w-12 h-12 text-green-600" />
                   </div>
                   <h3 className="text-3xl font-bold text-green-400 mb-2">Richtig!</h3>
                   <p className="text-slate-300">{String(riddle.solutionExplanation)}</p>
                 </div>
              ) : (
                <>
                  {/* Image Display */}
                  {riddle.imageUrl ? (
                    <div className="w-full rounded-lg overflow-hidden border-4 border-amber-900/50 shadow-inner bg-black/20">
                      <img 
                        src={riddle.imageUrl} 
                        alt="Rätsel Bild" 
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ) : (
                    // Fallback visual if image is missing
                    <div className="w-full h-32 rounded-lg bg-gradient-to-br from-red-900 to-slate-900 border-2 border-yellow-900/30 flex items-center justify-center">
                      <div className="text-center opacity-50">
                        <PartyPopper className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
                        <span className="text-yellow-200/50 text-sm font-christmas">Weihnachtsrätsel</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <p className="text-lg text-slate-100 leading-relaxed font-serif">{String(riddle.question)}</p>
                  </div>

                  {/* Hints Section */}
                  {hintClicks > 0 && Array.isArray(riddle.hints) && (
                    <div className="space-y-2">
                      {riddle.hints.slice(0, hintClicks).map((hint, idx) => (
                        <div key={idx} className="bg-yellow-900/20 border-l-4 border-yellow-500 p-3 rounded animate-in slide-in-from-left-2 fade-in duration-300">
                          <p className="text-yellow-200 text-sm italic">
                            <span className="font-bold not-italic mr-2">Tipp {idx + 1}:</span> 
                            {String(hint)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {forceShowSolution ? (
                    <div className="bg-yellow-900/30 border border-yellow-600/50 p-4 rounded-lg text-center animate-in zoom-in duration-300">
                      <p className="text-yellow-200 font-bold mb-1">Die Lösung ist:</p>
                      <p className="text-xl text-white">{String(riddle.correctAnswer)}</p>
                      <p className="text-sm text-slate-400 mt-2">{String(riddle.solutionExplanation)}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {/* Check if options exist AND is an array */}
                      {riddle.type === 'choice' && Array.isArray(riddle.options) && riddle.options.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {riddle.options.map((option, idx) => (
                            <label 
                              key={idx}
                              className={`
                                flex items-center p-3 rounded-lg border cursor-pointer transition-all
                                ${userAnswer === String(option) 
                                  ? 'bg-yellow-600/20 border-yellow-500 text-yellow-100' 
                                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                }
                              `}
                            >
                              <input
                                type="radio"
                                name="riddle-option"
                                value={String(option)}
                                checked={userAnswer === String(option)}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                className="w-4 h-4 text-yellow-600 border-gray-600 focus:ring-yellow-500 bg-gray-700 mr-3"
                              />
                              {String(option)}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Deine Antwort..."
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      {showError && (
                        <p className="text-red-400 text-center text-sm font-bold animate-pulse">
                          Das stimmt leider noch nicht. Versuch's nochmal!
                        </p>
                      )}

                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-all active:scale-95 border-2 border-red-800"
                        >
                          Antwort prüfen
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleHintClick}
                          disabled={forceShowSolution}
                          className={`
                            flex-1 font-bold py-3 px-6 rounded-lg shadow-lg transform transition-all active:scale-95 border-2
                            flex items-center justify-center gap-2
                            ${forceShowSolution
                              ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
                              : 'bg-yellow-600 hover:bg-yellow-500 text-yellow-900 border-yellow-700'
                            }
                          `}
                        >
                          {forceShowSolution ? <Lightbulb size={20} /> : <Info size={20} />}
                          {hintButtonText}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-red-400">
              Ein Fehler ist aufgetreten. Bitte versuche es später erneut.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};