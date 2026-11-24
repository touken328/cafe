import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "도검난무 커뮤니티", // 필요에 맞게 수정하세요
  description: "도검난무", // 필요에 맞게 수정하세요
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      {/* body의 기본 마진을 없애고 화면 전체 높이(h-screen)를 고정합니다. */}
      <body className="m-0 p-0 h-screen overflow-hidden flex flex-col bg-gray-50">
        
        {/* 
          main 태그가 남은 공간을 꽉 채우도록 flex-1, flex, flex-col을 추가합니다.
          이렇게 해야 내부의 iframe 컨테이너가 100% 높이를 가질 수 있습니다.
        */}
        <main className="flex-1 w-full flex flex-col overflow-hidden relative">
          {children}
        </main>

      </body>
    </html>
  )
}