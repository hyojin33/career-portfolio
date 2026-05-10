import "./globals.css";
import Script from "next/script";
import { Providers } from "@/components/Providers";
import { Noto_Sans_KR } from "next/font/google";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans-kr",
});

export const metadata = {
  title: "진로 학습플랫폼",
  description: "직업계고 학생을 위한 AI 기반 자기주도적 진로 설계",
};

// AbortError 억제: React/Next 로드 전에 등록해 오버레이가 뜨지 않게 함
const abortErrorSuppressScript = `
(function(){
  function isAbort(e){
    if(!e) return false;
    var name = (e && typeof e.name === 'string') ? e.name : '';
    var msg = (e && typeof e.message === 'string') ? e.message : String(e);
    return name === 'AbortError' || name === 'CanceledError' ||
      /aborted|signal is aborted|without reason/i.test(msg);
  }
  window.addEventListener('unhandledrejection', function(ev){
    if(isAbort(ev.reason)){ ev.preventDefault(); ev.stopPropagation(); }
  }, true);
  window.addEventListener('error', function(ev){
    if(ev.error && isAbort(ev.error)){ ev.preventDefault(); ev.stopPropagation(); }
    else if(ev.message && /aborted|signal is aborted|without reason/i.test(ev.message)){
      ev.preventDefault(); ev.stopPropagation();
    }
  }, true);
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body className={notoSansKr.className}>
        <Script
          id="abort-error-suppress"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: abortErrorSuppressScript }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
