// src/app/forecast/layout.tsx

import React from "react";

export default function ForecastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="bg-[#2f52db] text-white flex items-center px-4 h-[60px] shadow-md">
        <div className="text-[22px] font-bold mr-32">DigiTradeX</div>
        <nav className="flex">
          <a
            href="https://tech0-gen-8-step4-dtx-pofront-b8dygjdpcgcbg8cd.canadacentral-01.azurewebsites.net/"
            className="px-6 h-[60px] text-[18px] hover:bg-white/10 transition flex items-center"
          >
            PO読取
          </a>
          <a
            href="https://tech0-gen-8-step4-dtx-pofront-b8dygjdpcgcbg8cd.canadacentral-01.azurewebsites.net/po/list"
            className="px-6 h-[60px] text-[18px] hover:bg-white/10 transition flex items-center"
          >
            一覧
          </a>
          <a
            href="https://tech0-gen-8-step4-dtx-sbfront-a2dde6enhbghc8bx.canadacentral-01.azurewebsites.net/"
            className="px-6 h-[60px] text-[18px] hover:bg-white/10 transition flex items-center"
          >
            船ブッキング
          </a>
          <button className="px-6 h-[60px] text-[18px] bg-[#dce8ff] text-[rgba(0,0,0,0.8)] font-medium">
            バンニング見込み
          </button>
        </nav>
      </header>

      <main>{children}</main>
    </>
  );
}
