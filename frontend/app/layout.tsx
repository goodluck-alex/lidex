import { AppChrome } from "../components/AppChrome";
import { ModeProvider } from "../context/mode";
import { Web3Providers } from "../components/Web3Providers";
import Script from "next/script";
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
        <Script
          id="tawk-to"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var pid=${JSON.stringify(
              process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID || "69d63241c81db11c3ab8e613"
            )};if(!pid)return;var Tawk_API=window.Tawk_API=window.Tawk_API||{},Tawk_LoadStart=new Date();Tawk_API.onLoad=function(){try{setTimeout(function(){try{if(window.Tawk_API&&typeof window.Tawk_API.popup==='function'){window.Tawk_API.popup();}}catch(e){}},5000);}catch(e){}};var s1=document.createElement('script'),s0=document.getElementsByTagName('script')[0];s1.async=true;s1.src='https://embed.tawk.to/'+pid+'/default';s1.charset='UTF-8';s1.setAttribute('crossorigin','*');s0.parentNode.insertBefore(s1,s0);}catch(e){}})();`
          }}
        />
      </body>
    </html>
  );
}

