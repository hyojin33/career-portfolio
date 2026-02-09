import "./globals.css";
import { Providers } from "./components/Providers";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={notoSansKr.variable}>
      <body className={notoSansKr.className}>
        {/* Providers로 감싸야 로그인이 작동합니다 */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
