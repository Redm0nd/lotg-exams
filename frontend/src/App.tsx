import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuizList from './pages/QuizList';
import QuizTake from './pages/QuizTake';
import QuizResults from './pages/QuizResults';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<QuizList />} />
        <Route path="/quiz/:quizId" element={<QuizTake />} />
        <Route path="/quiz/:quizId/results" element={<QuizResults />} />
      </Routes>
    </BrowserRouter>
  );
}
