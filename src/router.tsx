import { createBrowserRouter } from "react-router";
import App from "./App";
import { SettingsPage } from "./pages/Settings";
import { LibraryPage } from "./pages/Library";
import { HomePage } from "./pages/Home";

export const router = createBrowserRouter([
  {
    path: "/",
    element: HomePage(),
  },
  {
    path: "/library",
    element: LibraryPage(),
  },
  {
    path: "/settings",
    element: SettingsPage(),
  },
]);
