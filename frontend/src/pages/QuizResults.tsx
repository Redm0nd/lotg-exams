import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Question, Answer } from '../types';

// Mock data for correct answers and explanations
// In a real app, this would come from a POST /quizzes/{id}/submit endpoint
const MOCK_ANSWERS: Record<string, { correctAnswer: number; explanation: string; lawReference: string }> = {
  '001': { correctAnswer: 0, explanation: 'According to Law 1, the maximum length is 120m and the maximum width is 90m for international matches.', lawReference: 'Law 1.1' },
  '002': { correctAnswer: 0, explanation: 'The minimum length is 90m and the minimum width is 45m according to Law 1.', lawReference: 'Law 1.1' },
  '003': { correctAnswer: 0, explanation: 'The center circle has a radius of 9.15m (10 yards) from the center mark.', lawReference: 'Law 1.7' },
  '004': { correctAnswer: 0, explanation: 'The corner arc has a radius of 1m (1 yard) from each corner flagpost.', lawReference: 'Law 1.9' },
  '005': { correctAnswer: 0, explanation: 'The penalty mark is 11m (12 yards) from the midpoint of the goal line.', lawReference: 'Law 1.11' },
  '006': { correctAnswer: 0, explanation: 'The distance between the goalposts is 7.32m (8 yards).', lawReference: 'Law 1.5' },
  '007': { correctAnswer: 0, explanation: 'The distance from the lower edge of the crossbar to the ground is 2.44m (8 feet).', lawReference: 'Law 1.5' },
  '008': { correctAnswer: 0, explanation: 'Two lines are drawn at right angles to the goal line, 16.5m (18 yards) from each goalpost.', lawReference: 'Law 1.11' },
  '009': { correctAnswer: 0, explanation: 'All lines must be of the same width, which must not be more than 12cm (5 inches).', lawReference: 'Law 1.2' },
  '010': { correctAnswer: 0, explanation: 'Artificial surfaces are allowed where competition rules permit, and they must be green.', lawReference: 'Law 1.3' },
};

export default function QuizResults() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    const storedQuestions = sessionStorage.getItem('quizQuestions');
    const storedAnswers = sessionStorage.getItem('quizAnswers');

    if (!storedQuestions || !storedAnswers) {
      navigate(`/quiz/${quizId}`);
      return;
    }

    setQuestions(JSON.parse(storedQuestions));
    setAnswers(JSON.parse(storedAnswers));
  }, [quizId, navigate]);

  if (questions.length === 0 || answers.length === 0) {
    return null;
  }

  const results = questions.map((question) => {
    const answer = answers.find((a) => a.questionId === question.questionId);
    const mockAnswer = MOCK_ANSWERS[question.questionId] || {
      correctAnswer: 0,
      explanation: 'Explanation not available.',
      lawReference: 'N/A',
    };

    return {
      question,
      selectedOption: answer?.selectedOption ?? -1,
      correctOption: mockAnswer.correctAnswer,
      isCorrect: answer?.selectedOption === mockAnswer.correctAnswer,
      explanation: mockAnswer.explanation,
      lawReference: mockAnswer.lawReference,
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

  const handleRetry = () => {
    sessionStorage.removeItem('quizQuestions');
    sessionStorage.removeItem('quizAnswers');
    navigate(`/quiz/${quizId}`);
  };

  const handleBackToQuizzes = () => {
    sessionStorage.removeItem('quizQuestions');
    sessionStorage.removeItem('quizAnswers');
    navigate('/');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="card mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Quiz Results</h1>
        <div className="flex items-center justify-center gap-8 mb-4">
          <div>
            <div className="text-5xl font-bold text-primary-600">{percentage}%</div>
            <div className="text-gray-600 mt-1">Score</div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-gray-900">
              {correctCount}/{totalCount}
            </div>
            <div className="text-gray-600 mt-1">Correct Answers</div>
          </div>
        </div>
        <div className="flex gap-4 justify-center mt-6">
          <button onClick={handleRetry} className="btn-primary">
            Retry Quiz
          </button>
          <button onClick={handleBackToQuizzes} className="btn-secondary">
            Back to Quizzes
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {results.map((result, index) => (
          <div key={result.question.questionId} className="card">
            <div className="flex items-start gap-4">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  result.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {result.isCorrect ? '✓' : '✗'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {index + 1}. {result.question.text}
                </h3>

                <div className="space-y-2 mb-4">
                  {result.question.options.map((option, optionIndex) => {
                    const isCorrect = optionIndex === result.correctOption;
                    const isSelected = optionIndex === result.selectedOption;

                    return (
                      <div
                        key={optionIndex}
                        className={`p-3 rounded-lg border-2 ${
                          isCorrect
                            ? 'border-green-500 bg-green-50'
                            : isSelected
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900">{option}</span>
                          {isCorrect && (
                            <span className="text-sm font-medium text-green-700">
                              Correct Answer
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="text-sm font-medium text-red-700">
                              Your Answer
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Explanation ({result.lawReference})
                  </p>
                  <p className="text-sm text-blue-800">{result.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
