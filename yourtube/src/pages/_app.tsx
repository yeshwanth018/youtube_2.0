import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { ThemeProvider } from "../lib/ThemeContext";
import { SidebarProvider } from "../lib/SidebarContext";
import Script from "next/script";
import Head from "next/head";
export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <SidebarProvider>
          <Head>
            <title>Your-Tube Clone</title>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
          </Head>
          <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
          <div className="min-h-screen bg-background text-foreground transition-colors duration-300 overflow-x-hidden">
            <Header />
            <Toaster />
            <div className="flex relative">
              <Sidebar />
              <main className="flex-1 min-w-0">
                <Component {...pageProps} />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

