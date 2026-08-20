import { Fragment, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { queryClient } from "./lib/queryClient.ts";
import PWAInstallModal from "./components/pwa/PWAInstallModal";

const RootMode = import.meta.env.DEV ? Fragment : StrictMode;

document.documentElement.lang = "ar-EG";
document.documentElement.dir = "rtl";
document.title = "هوريكا سمارت | لوحة التحكم";

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : typeof event.reason === "string"
          ? event.reason
          : "";

    if (message.includes("Could not establish connection. Receiving end does not exist.")) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <RootMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <AppWrapper>
            <App />
            <PWAInstallModal />
          </AppWrapper>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </RootMode>,
);
