import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "./App.jsx";
import { ProtectedRoute } from "../components/auth/ProtectedRoute.jsx";
import { CandidateCardPage } from "../pages/CandidateCardPage/CandidateCardPage.jsx";
import { CandidatesPage } from "../pages/CandidatesPage/CandidatesPage.jsx";
import { ComparisonPage } from "../pages/ComparisonPage/ComparisonPage.jsx";
import { DashboardPage } from "../pages/DashboardPage/DashboardPage.jsx";
import { DictionaryPage } from "../pages/DictionaryPage/DictionaryPage.jsx";
import { LoginPage } from "../pages/LoginPage/LoginPage.jsx";
import { RequestFormPage } from "../pages/RequestFormPage/RequestFormPage.jsx";
import { RequestsPage } from "../pages/RequestsPage/RequestsPage.jsx";
import { RulesPage } from "../pages/RulesPage/RulesPage.jsx";
import { UsersPage } from "../pages/UsersPage/UsersPage.jsx";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <ProtectedRoute scope="dashboard"><DashboardPage /></ProtectedRoute> },
      { path: "requests", element: <ProtectedRoute scope="requests"><RequestsPage /></ProtectedRoute> },
      { path: "requests/new", element: <ProtectedRoute scope="requestEdit"><RequestFormPage /></ProtectedRoute> },
      { path: "requests/:requestId", element: <ProtectedRoute scope="requests"><RequestFormPage /></ProtectedRoute> },
      { path: "candidates", element: <ProtectedRoute scope="candidates"><CandidatesPage /></ProtectedRoute> },
      { path: "candidates/:candidateId", element: <ProtectedRoute scope="candidates"><CandidateCardPage /></ProtectedRoute> },
      { path: "comparison", element: <ProtectedRoute scope="comparison"><ComparisonPage /></ProtectedRoute> },
      { path: "dictionary", element: <ProtectedRoute scope="dictionary"><DictionaryPage /></ProtectedRoute> },
      { path: "users", element: <ProtectedRoute scope="users"><UsersPage /></ProtectedRoute> },
      { path: "rules", element: <ProtectedRoute scope="rules"><RulesPage /></ProtectedRoute> },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
