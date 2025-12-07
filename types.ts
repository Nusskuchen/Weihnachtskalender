export type RiddleType = 'text' | 'choice';

export interface Riddle {
  day: number;
  question: string;
  type: RiddleType;
  options?: string[]; // Only if type is 'choice'
  correctAnswer: string; // The canonical correct answer
  acceptedAnswers?: string[]; // Additional valid answers for text input
  solutionExplanation: string; // Explains the solution
  hints: string[]; // Array of 3 progressive hints
  imageUrl?: string; // Base64 encoded image string
}

export interface DoorState {
  isOpen: boolean;
  isSolved: boolean;
  riddle?: Riddle;
}

export type CalendarState = Record<number, DoorState>;