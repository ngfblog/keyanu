import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/store/auth-context";
import { ToastProvider } from "@/components/common/toast";
import { ProtectedRoute } from "@/routes/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { LoginPage } from "@/pages/login-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { ResourcesPage } from "@/pages/resources-page";
import { ResourceDetailPage } from "@/pages/resource-detail-page";
import { NotFoundPage } from "@/pages/not-found-page";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
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
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
