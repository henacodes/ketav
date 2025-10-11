
import ReactDOM from "react-dom/client";
import { router } from "./router.tsx";
import { RouterProvider } from "react-router/dom";
import "./index.css";

const rootEl = document.getElementById("root") as HTMLElement;
ReactDOM.createRoot(rootEl).render(<RouterProvider router={router} />);
