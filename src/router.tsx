import { createBrowserRouter } from "react-router";
import { SettingsPage } from "./pages/Settings";
import { LibraryPage } from "./pages/Library";
import { HomePage } from "./pages/Home";
import { StreakPage } from "./pages/Streak";
import RootLayout from "./layouts/Root";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GoalsPage } from "./pages/Goals";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "library",
        element: <LibraryPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "streak",
        element: <StreakPage />,
      },
      {
        path: "goals",
        element: <GoalsPage />,
      },
    ],
  },
]);
