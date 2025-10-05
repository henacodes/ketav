import React from "react";
import ReactDOM from "react-dom/client";
import { router } from "./router.tsx";
import { RouterProvider } from "react-router/dom";

import "./index.css";
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <html lang="en" className="dark">
      <body>
        <RouterProvider router={router} />
      </body>
    </html>
  </React.StrictMode>
);
