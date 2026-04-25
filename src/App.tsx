import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EditorPage from './pages/EditorPage';
import CollagePage from './pages/CollagePage';
import ImageGenPage from './pages/ImageGenPage';
import MusicGenPage from './pages/MusicGenPage';
import WorkspacePage from './pages/WorkspacePage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/collage" element={<CollagePage />} />
        <Route path="/image-gen" element={<ImageGenPage />} />
        <Route path="/music-gen" element={<MusicGenPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
      </Routes>
    </Router>
  );
}
