import { Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/HomePage.jsx';
import HostDashboard from './pages/HostDashboard.jsx';
import HostQuizEditor from './pages/HostQuizEditor.jsx';
import HostPresenter from './pages/HostPresenter.jsx';
import PlayerPage from './pages/PlayerPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/host" element={<HostDashboard />} />
      <Route path="/host/quiz/new" element={<HostQuizEditor />} />
      <Route path="/host/quiz/:id/edit" element={<HostQuizEditor />} />
      <Route path="/host/present/:pin" element={<HostPresenter />} />
      <Route path="/play" element={<PlayerPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
