import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuizList from './pages/QuizList';
import QuizTake from './pages/QuizTake';
import QuizResults from './pages/QuizResults';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUpload from './pages/admin/Upload';
import AdminJobs from './pages/admin/Jobs';
import AdminJobDetail from './pages/admin/JobDetail';
import AdminReview from './pages/admin/Review';
import AdminQuestionBank from './pages/admin/QuestionBank';
import AdminCreateQuiz from './pages/admin/CreateQuiz';
import AdminAddQuestion from './pages/admin/AddQuestion';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public quiz routes */}
        <Route path="/" element={<QuizList />} />
        <Route path="/quiz/:quizId" element={<QuizTake />} />
        <Route path="/quiz/:quizId/results" element={<QuizResults />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="upload" element={<AdminUpload />} />
          <Route path="create" element={<AdminCreateQuiz />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="jobs/:jobId" element={<AdminJobDetail />} />
          <Route path="jobs/:jobId/add" element={<AdminAddQuestion />} />
          <Route path="review" element={<AdminReview />} />
          <Route path="questions" element={<AdminQuestionBank />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
