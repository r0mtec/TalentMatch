import { createBrowserRouter, Navigate } from "react-router-dom";
import { App } from "./App.jsx";
import { CandidateCardPage } from "../pages/CandidateCardPage/CandidateCardPage.jsx";
import { CandidatesPage } from "../pages/CandidatesPage/CandidatesPage.jsx";
import { ComparisonPage } from "../pages/ComparisonPage/ComparisonPage.jsx";
import { DashboardPage } from "../pages/DashboardPage/DashboardPage.jsx";
import { DictionaryPage } from "../pages/DictionaryPage/DictionaryPage.jsx";
import { LoginPage } from "../pages/LoginPage/LoginPage.jsx";
import { RequestFormPage } from "../pages/RequestFormPage/RequestFormPage.jsx";
import { RequestsPage } from "../pages/RequestsPage/RequestsPage.jsx";
import { UsersPage } from "../pages/UsersPage/UsersPage.jsx";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "requests", element: <RequestsPage /> },
      { path: "requests/new", element: <RequestFormPage /> },
      { path: "requests/:requestId", element: <RequestFormPage /> },
      { path: "candidates", element: <CandidatesPage /> },
      { path: "candidates/:candidateId", element: <CandidateCardPage /> },
      { path: "comparison", element: <ComparisonPage /> },
      { path: "dictionary", element: <DictionaryPage /> },
      { path: "users", element: <UsersPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
