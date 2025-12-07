import React, { useState, useEffect, Component, type ErrorInfo, type ReactNode } from 'react';
import { Snowfall } from './components/Snowfall';
import { DoorGrid } from './components/DoorGrid';
import { RiddleModal } from './components/RiddleModal';
import { generateRiddleForDay } from './services/geminiService';
import { CalendarState, Riddle } from './types';
import { Settings, RefreshCw, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'advent_calendar_progress_v1';

interface ErrorBoundaryProps {
  children?: ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary Component to catch crashes in children (like RiddleModal)
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("RiddleModal crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-red-500 rounded-xl p-6 max-w-sm text-center shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl text-red-100 font-bold mb-2">Ups, ein Fehler!</h3>
            <p className="text-slate-400 mb-6">
              Beim Anzeigen des Rätsels ist etwas schiefgelaufen. 
              Keine Sorge, dein Fortschritt ist sicher.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset();
              }}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Schließen & nochmal versuchen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [calendarState, setCalendarState] = useState<CalendarState>({});
  
  // Modal State
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [currentRiddle, setCurrentRiddle] = useState<Riddle | null>(null);
  const [loadingRiddle, setLoadingRiddle] = useState(false);
  
  // Debug State
  const [showDebug, setShowDebug] = useState(false);

  // Initial Load
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCalendarState(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse calendar state", e);
      }
    }
  }, []);

  // Persist State (Optimized to avoid QuotaExceededError)
  useEffect(() => {
    if (Object.keys(calendarState).length > 0) {
      try {
        // Create a lightweight copy of the state for storage
        // We MUST strip the 'imageUrl' (Base64) because it's too large for localStorage (5MB limit).
        const stateToSave: CalendarState = {};
        
        Object.keys(calendarState).forEach((key) => {
          const day = Number(key);
          const door = calendarState[day];
          
          if (door) {
            stateToSave[day] = {
              ...door,
              riddle: door.riddle ? {
                ...door.riddle,
                imageUrl: undefined // REMOVE IMAGE FROM STORAGE
              } : undefined
            };
          }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (e) {
        console.error("LocalStorage save failed (likely quota exceeded):", e);
      }
    }
  }, [calendarState]);

  const handleOpenDoor = async (day: number) => {
    setSelectedDay(day);
    
    // Check if we already have the riddle data in state
    if (calendarState[day]?.riddle) {
      setCurrentRiddle(calendarState[day].riddle!);
    } else {
      // Fetch new riddle
      setLoadingRiddle(true);
      setCurrentRiddle(null);
      try {
        const riddle = await generateRiddleForDay(day);
        
        // --- STRICT DATA VALIDATION BEFORE SETTING STATE ---
        // Ensure options is a valid string array if choice type
        if (riddle.type === 'choice' && (!riddle.options || !Array.isArray(riddle.options))) {
           console.warn("Riddle invalid options, fallback to text", riddle);
           riddle.type = 'text';
        }

        // Ensure hints is a valid string array
        if (!riddle.hints || !Array.isArray(riddle.hints)) {
           riddle.hints = ["Hinweis 1: Lies genau.", "Hinweis 2: Denk nach.", "Hinweis 3: Fast da."];
        }

        // Ensure essential strings are present
        riddle.question = riddle.question || "Konnte Frage nicht laden.";
        riddle.correctAnswer = riddle.correctAnswer || "Fehler";
        riddle.solutionExplanation = riddle.solutionExplanation || "Keine Erklärung verfügbar.";

        setCurrentRiddle(riddle);
        
        // Update state - this will trigger the useEffect to save (without image)
        setCalendarState(prev => ({
          ...prev,
          [day]: {
            ...prev[day],
            isOpen: true,
            riddle: riddle
          }
        }));
      } catch (e) {
        console.error("Error generating riddle:", e);
        // Error will be shown by RiddleModal's internal state (riddle === null && !isLoading)
      } finally {
        setLoadingRiddle(false);
      }
    }
  };

  const handleRiddleSolved = () => {
    if (selectedDay === null) return;
    
    setCalendarState(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        isSolved: true
      }
    }));
    
    // Close modal after a short delay
    setTimeout(() => {
      setSelectedDay(null);
      setCurrentRiddle(null);
    }, 500);
  };

  const handleCloseModal = () => {
    setSelectedDay(null);
    setCurrentRiddle(null);
  }

  // Debug Helper to Change Date
  const simulateDate = (day: number) => {
    const d = new Date();
    d.setMonth(11); // December
    d.setDate(day);
    setCurrentDate(d);
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center">
      <Snowfall />

      {/* Hero Header */}
      <header className="w-full text-center pt-10 pb-6 relative z-10 px-4">
        <h1 className="text-4xl md:text-6xl font-christmas font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 drop-shadow-lg mb-2">
          Adventskalender
        </h1>
        <p className="text-slate-300 font-medium">
          Öffne jeden Tag ein Türchen und löse das Rätsel!
        </p>
      </header>

      {/* Main Grid */}
      <main className="flex-1 w-full flex flex-col items-center z-10">
        <DoorGrid 
          currentDate={currentDate} 
          calendarState={calendarState} 
          onOpenDoor={handleOpenDoor} 
        />
      </main>

      {/* Footer / Debug */}
      <footer className="w-full p-4 text-center text-slate-500 text-sm z-10 relative mt-8 mb-4">
        <p>© {new Date().getFullYear()} Weihnachts-Rätselspaß</p>
        
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="absolute bottom-4 right-4 p-2 text-slate-700 hover:text-slate-400 transition-colors"
          title="Debug Menu"
        >
          <Settings size={20} />
        </button>

        {showDebug && (
          <div className="absolute bottom-14 right-4 bg-slate-800 p-4 rounded-lg border border-slate-600 shadow-xl text-left w-64">
            <h4 className="text-yellow-400 font-bold mb-2 flex items-center">
              <RefreshCw size={14} className="mr-2" /> Debug Modus
            </h4>
            <p className="mb-2 text-xs">Simuliere ein Datum:</p>
            <div className="grid grid-cols-5 gap-1">
              {Array.from({length: 25}, (_, i) => i + 1).map(d => (
                <button
                  key={d}
                  onClick={() => simulateDate(d)}
                  className={`text-xs p-1 rounded ${currentDate.getDate() === d ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700">
               <p className="text-xs text-slate-400">Aktuell: {currentDate.toLocaleDateString()}</p>
               <button 
                onClick={() => { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }}
                className="mt-2 text-xs text-red-400 underline hover:text-red-300"
               >
                 Fortschritt zurücksetzen
               </button>
            </div>
          </div>
        )}
      </footer>

      {/* Modal wrapped in ErrorBoundary */}
      {selectedDay && (
        <ErrorBoundary onReset={handleCloseModal}>
          <RiddleModal 
            day={selectedDay}
            riddle={currentRiddle}
            isLoading={loadingRiddle}
            onClose={handleCloseModal}
            onSolved={handleRiddleSolved}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default App;