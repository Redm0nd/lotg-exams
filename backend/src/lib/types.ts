// DynamoDB item types
export interface QuizItem {
  PK: string;
  SK: string;
  Type: 'Quiz';
  quizId: string;
  title: string;
  description: string;
  category: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionItem {
  PK: string;
  SK: string;
  Type: 'Question';
  quizId: string;
  questionId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  lawReference: string;
}

// API response types
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

export interface QuestionWithAnswer extends Question {
  correctAnswer: number;
  explanation: string;
  lawReference: string;
}

// Lambda event types
export interface APIGatewayProxyEvent {
  httpMethod: string;
  path: string;
  pathParameters: { [key: string]: string } | null;
  queryStringParameters: { [key: string]: string } | null;
  headers: { [key: string]: string };
  body: string | null;
}

export interface APIGatewayProxyResult {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
}
