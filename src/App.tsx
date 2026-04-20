import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RecordPage } from '@/pages/RecordPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { LessonDetailPage } from '@/pages/LessonDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/library" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/lessons/:id" element={<LessonDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
