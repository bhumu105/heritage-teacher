import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { AppShell } from '@/components/AppShell'
import { RequireAuth } from '@/components/RequireAuth'
import { LoginPage } from '@/pages/LoginPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { RecordPage } from '@/pages/RecordPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { LessonDetailPage } from '@/pages/LessonDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { JoinPage } from '@/pages/JoinPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/library" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/record" element={<RecordPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/lessons/:id" element={<LessonDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
