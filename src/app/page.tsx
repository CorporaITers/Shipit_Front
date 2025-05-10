"use client";

import React from "react";
import { useEffect, useState } from "react";
import Script from 'next/script';

type ScheduleResult = {
  company: string;
  vessel: string;
  fare: string;
  etd: string;
  eta: string;
  schedule_url?: string;
  raw_response: string;
  status?: string; // 任意（optional）
};

const DEPARTURE_DESTINATION_MAP: Record<string, string[]> = {
  Kobe: ["Shanghai", "Singapore", "Los Angeles", "Rotterdam", "Hamburg", "Dubai", "New York", "Hong Kong", "Busan", "Sydney"],
  Osaka: ["Shanghai", "Singapore", "Los Angeles", "Rotterdam", "Hamburg", "Dubai", "New York", "Hong Kong", "Busan", "Sydney"],
  Yokohama: ["Shanghai", "Singapore", "Los Angeles", "Rotterdam", "Hamburg", "Dubai", "New York", "Hong Kong", "Busan", "Sydney"],
  Tokyo: ["Shanghai", "Singapore", "Los Angeles", "Rotterdam", "Hamburg", "Dubai", "New York", "Hong Kong", "Busan", "Sydney"]
};



export default function Home() {
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [etd, setEtd] = useState("");
  const [eta, setEta] = useState("");
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<ScheduleResult[]>([]);
  const [error, setError] = useState("");
  const [feedbackSentMap, setFeedbackSentMap] = useState<Record<string, boolean>>({});
  const [showRawMap, setShowRawMap] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const handleStatusChange = (index: number, newStatus: "done" | "processing" | "exclude") => {
    const updated = [...results];
    const currentStatus = updated[index].status;
    updated[index].status = currentStatus === newStatus ? "none" : newStatus;

    setResults(updated);
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case "done":
        return "bg-blue-100";
      case "processing":
        return "bg-pink-100";
      case "exclude":
        return "bg-gray-200";
      default:
        return "bg-white";
    }
  };

  useEffect(() => {
    console.log("✅取得したresults:", results);
    if (!Array.isArray(results)) {
      console.warn("⚠️ resultsが配列ではありません:", typeof results);
    }
    if (results.length > 0) {
      console.log("🟢 表示可能な結果があります:", results);
    } else {
      console.log("🟡 結果は空配列です。");
    }
  }, [results]);

  useEffect(() => {
    setAvailableDestinations(DEPARTURE_DESTINATION_MAP[departure] || []);
    setDestination("");
  }, [departure]);

  const handleSubmit = async () => {
    setSubmitted(true);
    setError("");
    setResults([]);
    setFeedbackSentMap({});
    setShowRawMap({});
    setIsLoading(true); // ← 追加

    if (!etd && !eta) {
      setIsLoading(false); // ← エラーでも必ずfalseに
      setError("ETDまたはETAのいずれかを入力してください。");
      return;
    }

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + '/recommend-shipping', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure_port: departure,
          destination_port: destination,
          etd_date: etd || null,
          eta_date: eta || null
        })
      });
      const data = await res.json();
      console.log("🧪受信したdata:", data); // ←これ追加して中身確認

      
      if (res.ok) {
        const newResults = data.map((item: ScheduleResult) => ({
          ...item,           // ← 元のデータを維持
          status: "none"     // ← 初期状態（まだタグ未選択）
        })).sort((a: ScheduleResult, b: ScheduleResult) => {
          const fareA = Number(a.fare ?? Infinity);
          const fareB = Number(b.fare ?? Infinity);
          return fareA - fareB;
        });

        setResults(newResults);  // ← 加工後のデータをセットする
      } else {
        setResults([]);  // ← 明示的に空配列を設定
        const specificError = data.reason === "no_schedule_for_destination"
          ? "この目的地へのスケジュールは現在ありません。"
          : data.reason === "no_schedule"
          ? "該当するスケジュールが存在しません。"
          : data.reason === "pdf_not_found"
          ? "PDFスケジュールファイルが見つかりませんでした。"
          : "スケジュール取得に失敗しました。";
        setError(data.error || specificError);
      }
    } catch (err) {
      console.error(err);
      setError("通信エラーが発生しました。");
    } finally {
      setIsLoading(false); // ← 必ず最後にfalse
    }
  };

  const handleFeedback = async (index: number, value: "yes" | "no") => {
    const schedule = results[index];
    try {
      await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + 'update-feedback', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: schedule.schedule_url,
          etd: schedule.etd,
          eta: schedule.eta,
          feedback: value
        })
      });
      setFeedbackSentMap((prev) => ({ ...prev, [index]: true }));
    } catch (err) {
      console.error("Feedback送信失敗:", err);
    }
  };

  const toggleRaw = (index: number) => {
    setShowRawMap((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleEtaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEta(e.target.value);
    if (e.target.value) setEtd("");
  };

    const handleEtdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEtd(e.target.value);
    if (e.target.value) setEta("");
  };

  return (
    <>
    {/* ヘッダー */}
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
          <button className="px-6 h-[60px] text-[18px] bg-[#dce8ff] text-[rgba(0,0,0,0.8)] font-medium">船ブッキング</button>
          <a
            href="https://tech0-gen-8-step4-dtx-sbfront-a2dde6enhbghc8bx.canadacentral-01.azurewebsites.net/forecast"
            className="px-6 h-[60px] text-[18px] hover:bg-white/10 transition flex items-center"
          >
            バンニング見込み
          </a>
        </nav>
    </header>

    {/* メイン */}
    <div className="p-8 w-full max-w-none bg-gray-50 min-h-screen">

    {/* 検索フォームと結果を横並びにするflex */}
    <div className="flex justify-center flex-col lg:flex-row gap-6 w-full">

      {/* 検索フォーム全体をカードで囲む*/}
      <div className="w-full lg:w-1/3 p-6 bg-white rounded-xl shadow-md space-y-4 mb-8">
      <h1 className="text-base font-semibold text-gray-800 bg-blue-100 px-4 py-2 rounded-xl">スケジュール検索</h1>

      {/* 検索フォーム */}
      <div className="mb-4">
        <label className="block mb-1 font-semibold">出港地：</label>
        <select className="w-full p-2 border rounded" value={departure} onChange={(e) => setDeparture(e.target.value)}>
          <option value="">選択してください</option>
          {Object.keys(DEPARTURE_DESTINATION_MAP).map((port) => (
            <option key={port} value={port}>{port}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">目的地：</label>
        <select
          className="w-full p-2 border rounded"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          disabled={!departure}
        >
          <option value="">選択してください</option>
          {availableDestinations.map((port) => (
            <option key={port} value={port}>{port}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">出港予定日（ETD）：</label>
        <input
          type="date"
          className="w-full p-2 border rounded"
          value={etd}
          onChange={handleEtdChange}
          disabled={eta !== ""}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-semibold">到着予定日（ETA）：</label>
        <input
          type="date"
          className="w-full p-2 border rounded"
          value={eta}
          onChange={handleEtaChange}
          disabled={etd !== ""}
        />
      </div>

      <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        レコメンド取得
      </button>

      {isLoading && (
        <div className="mt-4 text-blue-600 border border-blue-300 p-2 rounded bg-blue-50">
          渡航スケジュールを確認中です...
        </div>
      )}
      </div>

     {/* 結果表示 */}
<div className="w-full lg:w-2/3 px-6 bg-white rounded-xl shadow-md py-4 mb-8">
  <h2 className="text-base font-semibold text-gray-800 bg-blue-100 px-4 py-2 rounded-xl">レコメンド</h2>

  <div className="mt-4 space-y-4">
    {results.length === 0 ? (
      // レコメンド未取得時
      <div className="border rounded p-4 bg-gray-50 text-gray-400">
        レコメンド結果はまだありません。
      </div>
    ) : (
      // レコメンド取得時
      results.map((result, index) => (
        <div key={index} className={`border rounded p-4 ${getStatusBgColor(result.status)} flex flex-col space-y-2`}>
          {/* ステータスタグ */}
          <div className="flex items-center justify-between mb-2">
            {/* 船会社名とログインボタン（左寄せ） */}
            <div className="flex items-center space-x-4">
              <p className="text-xl font-bold">船会社：{result.company}</p>
              <button className="bg-blue-600 text-white px-3 py-1 text-sm rounded">ログイン</button>
            </div>
            {/* ステータスボタン（右寄せ）*/}
            <div className="space-x-2">
              <button
                onClick={() => handleStatusChange(index, "done")}
                className={`px-3 py-1 rounded text-sm font-semibold 
                  ${result.status === "done" ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-600"}`}
                >
                手配済
              </button>
              <button
                onClick={() => handleStatusChange(index, "processing")}
                className={`px-3 py-1 rounded text-sm font-semibold 
                  ${result.status === "processing" ? "bg-red-500 text-white" : "bg-pink-100 text-red-600"}`}
              >       
                手配中
              </button>
              <button
                onClick={() => handleStatusChange(index, "exclude")}
                className={`px-3 py-1 rounded text-sm font-semibold 
                  ${result.status === "exclude" ? "bg-gray-500 text-white" : "bg-gray-200 text-gray-700"}`}
              >
                除外
              </button>
            </div>
          </div>

          <hr className="border-t border-gray-300 mb-3" />

          <div className="ml-4 space-y-1 mt-2 text-gray-800">
            <p><strong>船名:</strong> {result.vessel}</p>
            <p><strong>運賃:</strong> ${result.fare} </p>
            <p><strong>出港日（ETD）:</strong> {result.etd}</p>
            <p><strong>到着予定日（ETA）:</strong> {result.eta}</p>
            <p>
              <a
                href={result.schedule_url ?? "#"} // ← fallbackを設定
                className="text-blue-600 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                スケジュールPDFを開く
              </a>
            </p>
          </div>

          
          <hr className="border-t border-gray-300 mb-3" />

          <div className="mt-4 flex justify-between items-center flex-wrap gap-2">
           {/* 左側：質問＋Yes/Noボタン＋感謝メッセージ */}
           <div className="flex items-center gap-2">
            <span className="text-sm">この抽出内容は適切でしたか？</span>

            <button
             onClick={() => handleFeedback(index, "yes")}
              className={`px-3 py-1 rounded border text-sm font-semibold 
                ${feedbackSentMap[index] === true ? "bg-gray-500 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
            >
              Yes
            </button>

            <button
              onClick={() => handleFeedback(index, "no")}
              className={`px-3 py-1 rounded border text-sm font-semibold 
                ${feedbackSentMap[index] === false ? "bg-gray-500 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
            >
             No
            </button>

           {feedbackSentMap[index] !== undefined && (
             <span className="text-green-600 text-sm">フィードバックありがとうございます。</span>
            )}
          </div>

            {/* ChatGPT抽出内容表示 */}
              <button onClick={() => toggleRaw(index)} className="text-sm text-blue-600 underline">
                {showRawMap[index] ? "ChatGPTの抽出内容を隠す" : "ChatGPTの抽出内容を表示"}
              </button>
                {showRawMap[index] && (
              <textarea className="w-full h-32 p-2 border rounded mt-2 bg-white" value={result.raw_response} readOnly></textarea>
                )}
          </div>
        </div>
      ))
    )}
  </div>

  {/* エラーメッセージ（共通） */}
  {(submitted && !isLoading && (error || results.length === 0)) && (
    <div className="mt-4 text-red-600 border border-red-300 p-2 rounded bg-red-50">
      {error || "該当する船便がありませんでした。"}
    </div>
  )}
  </div>
    </div>

    <footer className="fixed bottom-0 left-0 w-full bg-[#2f52db] text-white text-sm px-6 py-5 z-30 flex items-center">
      <div className="flex gap-6">
        <a href="#" className="hover:underline">こんな時は？</a>
        <a href="#" className="hover:underline">お問い合わせ</a>
      </div>
    </footer>


  </div> 

  <Script
    id="dify-config"
    strategy="afterInteractive"
    dangerouslySetInnerHTML={{
      __html: `
        window.difyChatbotConfig = {
          token: 'o5eR4Ibgrs8MWzXD'
        };
      `,
    }}
  />
  <Script
    src="https://udify.app/embed.min.js"
    id="o5eR4Ibgrs8MWzXD"
    defer
  />
  <style jsx global>{`
    #dify-chatbot-bubble-button {
      background-color: transparent !important;
      background-image: url('/dorimochan.png') !important;
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
      border-radius: 50% !important;
      width: 120px !important;
      height: 100px !important;
      bottom: 40px !important;
      right: 30px !important;
    }

    #dify-chatbot-bubble-button * {
      display: none !important;
    }


    #dify-chatbot-bubble-window {
      width: 24rem !important;
      height: 40rem !important;
      bottom: 70px !important;
      right: 30px !important;
    }
  `}</style>

  </>
  );
}
