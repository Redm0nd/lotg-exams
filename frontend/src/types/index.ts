export interface QuizSummary {
  quizId: string;
  title: string;
  description: string;
  category: string;
  questionCount: number;
}

export interface QuizDetail extends QuizSummary {
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  questionId: string;
  text: string;
  options: string[];
}

export interface Answer {
  questionId: string;
  selectedOption: number;
}

export interface QuizResult {
  question: Question;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
  explanation: string;
  lawReference: string;
}
