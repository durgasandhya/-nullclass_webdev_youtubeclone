import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";

function AppContent({ Component, pageProps }: AppProps) {
  const { theme } = useTheme();

  return (
    <div
      className={`min-h-screen ${
        theme === "light" ? "bg-white text-black" : "bg-gray-900 text-white"
      }`}
    >
      <title>Your-Tube Clone</title>
      <Header />
      <Toaster />
      <div className="flex">
        <Sidebar />
        <Component {...pageProps} />
      </div>
    </div>
  );
}

export default function App(props: AppProps) {
  return (
    <UserProvider>
      <ThemeProvider>
        <AppContent {...props} />
      </ThemeProvider>
    </UserProvider>
  );
}
