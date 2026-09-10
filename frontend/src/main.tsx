import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { authClient, AuthProvider } from "./auth";
import "./styles.css";

await authClient.initialize();
const initialResult = await authClient.handleRedirectPromise();
if (initialResult) authClient.setActiveAccount(initialResult.account);

const root = document.getElementById("root");
if (!root) throw new Error("Application root element was not found");

createRoot(root).render(
  <StrictMode>
    <AuthProvider initialResult={initialResult}>
      <App />
    </AuthProvider>
  </StrictMode>,
);
