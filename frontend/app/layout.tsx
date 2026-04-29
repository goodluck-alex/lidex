import { AppChrome } from "../components/AppChrome";
import { ModeProvider } from "../context/mode";
import { Web3Providers } from "../components/Web3Providers";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-lidex-bg text-white antialiased">
        <ModeProvider defaultMode="dex">
          <Web3Providers>
            <AppChrome>{children}</AppChrome>
          </Web3Providers>
        </ModeProvider>
      </body>
    </html>
  );
}

