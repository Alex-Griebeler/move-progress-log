import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Força o tema dark globalmente
document.documentElement.classList.add('dark');

createRoot(document.getElementById("root")!).render(<App />);
