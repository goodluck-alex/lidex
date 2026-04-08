import { AppChrome } from "../components/AppChrome";
import { ModeProvider } from "../context/mode";
import { Web3Providers } from "../components/Web3Providers";
import Script from "next/script";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tawkPropertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID || "";
  const tawkWidgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || "";

  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-lidex-bg text-white antialiased">
        <ModeProvider defaultMode="dex">
          <Web3Providers>
            <AppChrome>{children}</AppChrome>
          </Web3Providers>
        </ModeProvider>
        {tawkPropertyId && tawkWidgetId ? (
          <Script
            id="tawk-to"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var pid=${JSON.stringify(tawkPropertyId)};var wid=${JSON.stringify(
                tawkWidgetId
              )};if(!pid||!wid)return;var Tawk_API=window.Tawk_API=window.Tawk_API||{},Tawk_LoadStart=new Date();var s1=document.createElement('script'),s0=document.getElementsByTagName('script')[0];s1.async=true;s1.src='https://embed.tawk.to/'+pid+'/'+wid;s1.charset='UTF-8';s1.setAttribute('crossorigin','*');s0.parentNode.insertBefore(s1,s0);}catch(e){}})();`
            }}
          />
        ) : null}
      </body>
    </html>
  );
}

