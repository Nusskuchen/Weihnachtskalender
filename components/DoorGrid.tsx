import React from 'react';
import { Lock, Gift, Check } from 'lucide-react';
import { CalendarState } from '../types';

interface DoorGridProps {
  currentDate: Date;
  calendarState: CalendarState;
  onOpenDoor: (day: number) => void;
}

export const DoorGrid: React.FC<DoorGridProps> = ({ currentDate, calendarState, onOpenDoor }) => {
  // Generate days 6 to 24
  const days = Array.from({ length: 19 }, (_, i) => i + 6);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 max-w-5xl mx-auto relative z-10">
      {days.map((day) => {
        // Date Logic: 
        // 1. Must be December (Month 11 in JS 0-indexed months)
        // 2. The day of the door must be less than or equal to the current day
        const isDecember = currentDate.getMonth() === 11;
        const currentDay = currentDate.getDate();
        
        // If it's December, allow opening doors up to today. 
        // (If you want to allow looking back in January, you could add logic for that, 
        // but strictly for Advent, it's Dec only).
        const canOpen = isDecember && day <= currentDay;
        
        const state = calendarState[day] || { isOpen: false, isSolved: false };
        
        return (
          <button
            key={day}
            onClick={() => onOpenDoor(day)}
            disabled={!canOpen && !state.isSolved} // Locked doors are disabled unless already solved (viewable)
            className={`
              relative h-32 w-full rounded-xl border-2 transition-all duration-300 transform shadow-xl
              flex flex-col items-center justify-center overflow-hidden
              ${state.isSolved 
                ? 'bg-green-900/80 border-green-400 text-green-100 hover:scale-105' 
                : canOpen 
                  ? 'bg-red-700/90 border-yellow-400 text-yellow-100 cursor-pointer hover:bg-red-600 hover:scale-105' 
                  : 'bg-slate-800/80 border-slate-600 text-slate-500 cursor-not-allowed grayscale'
              }
            `}
          >
            {/* Pattern Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-200 to-transparent"></div>

            <span className="font-christmas text-4xl mb-2 font-bold z-10">{day}</span>
            
            <div className="z-10">
              {state.isSolved ? (
                <Check className="w-8 h-8 text-green-300" />
              ) : !canOpen ? (
                <Lock className="w-6 h-6 opacity-50" />
              ) : (
                <Gift className="w-8 h-8 text-yellow-300 animate-pulse" />
              )}
            </div>
            
            {!canOpen && (
              <div className="absolute inset-0 bg-black/40" />
            )}
          </button>
        );
      })}
    </div>
  );
};