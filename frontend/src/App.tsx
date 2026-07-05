import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/store/auth-context";
import { PreferencesProvider } from "@/store/preferences-context";
import { ToastProvider } from "@/components/common/toast";
import { ProtectedRoute } from "@/routes/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { LoginPage } from "@/pages/login-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { ResourcesPage } from "@/pages/resources-page";
import { ResourceDetailPage } from "@/pages/resource-detail-page";
import { SettingsLayout } from "@/pages/settings/settings-layout";
import { GeneralSettingsPage } from "@/pages/settings/general-page";
import { SecuritySettingsPage } from "@/pages/settings/security-page";
import { AppearanceSettingsPage } from "@/pages/settings/appearance-page";
import { AboutSettingsPage } from "@/pages/settings/about-page";
import { NotFoundPage } from "@/pages/not-found-page";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <PreferencesProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/workspaces/:workspaceId" element={<ResourcesPage />} />
                <Route path="/resources/:resourceId" element={<ResourceDetailPage />} />
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<Navigate to="general" replace />} />
                  <Route path="general" element={<GeneralSettingsPage />} />
                  <Route path="security" element={<SecuritySettingsPage />} />
                  <Route path="appearance" element={<AppearanceSettingsPage />} />
                  <Route path="about" element={<AboutSettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </PreferencesProvider>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
