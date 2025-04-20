"use client";

import { useEffect, useState } from "react";



const DEPARTURE_DESTINATION_MAP: Record<string, string[]> = {
  Kobe: ["Shanghai", "Singapore", "Los Angeles", "Rotterdam", "Hamburg", "Dubai", "New York", "Hong Kong", "Busan", "Sydney"],
  Osaka: ["Shanghai", "Singapore", "Los Angeles", "Rotterdam", "Hamburg", "Dubai", "New York", "Hong Kong", "Busan", "Sydney"],
  Yokohama: ["Shanghai", "Singapore", "Los Angeles", "Rotterdam", "Hamburg", "Dubai", "New York", "Hong Kong", "Busan", "Sydney"],
  Tokyo: ["Shanghai", "Singapore", "Los Angeles", "Rotterdam", "Hamburg", "Dubai", "New York", "Hong Kong", "Busan", "Sydney"]
};

export default function Home() {
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [eta, setEta] = useState("");
  const [etd, setEtd] = useState("");
  const [availableDestinations, setAvailableDestinations] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [feedbackSentMap, setFeedbackSentMap] = useState<Record<string, boolean>>({});
  const [showRawMap, setShowRawMap] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  
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

    if (!eta && !etd) {
      setIsLoading(false); // ← エラーでも必ずfalseに
      setError("ETAまたはETDのいずれかを入力してください。");
      return;
    }

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + '/recommend-shipping', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure_port: departure,
          destination_port: destination,
          eta_date: eta || null,
          etd_date: etd || null
        })
      });
      const data = await res.json();
      console.log("🧪受信したdata:", data); // ←これ追加して中身確認

      
      if (res.ok) {
        setResults(data);  // ← 必ず配列として受け取る前提に統一
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
      await fetch("http://localhost:8000/update-feedback", {
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
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">船会社レコメンド（ONE / COSCO対応）</h1>

      {/* フォーム */}
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

      {/* 結果表示 */}
      {results.length > 0 && (
        <div className="mt-6 space-y-6">
          {results.map((result, index) => (
            <div key={index} className="border rounded p-4 bg-gray-100">
              <p><strong>船会社:</strong> {result.company}</p>
              <p><strong>船名:</strong> {result.vessel}</p>
              <p><strong>運賃:</strong> {result.fare}</p>
              <p><strong>出港日（ETD）:</strong> {result.etd}</p>
              <p><strong>到着予定日（ETA）:</strong> {result.eta}</p>
              <a href={result.schedule_url} className="text-blue-600 underline mt-2 block" target="_blank" rel="noopener noreferrer">
                スケジュールPDFを開く
              </a>

              <div className="mt-4 space-x-2">
                <p className="mb-1">この抽出は正しかったですか？</p>
                <button onClick={() => handleFeedback(index, "yes")} className="bg-green-500 text-white px-3 py-1 rounded">Yes</button>
                <button onClick={() => handleFeedback(index, "no")} className="bg-red-500 text-white px-3 py-1 rounded">No</button>
                {feedbackSentMap[index] && <p className="text-green-600 mt-2">フィードバックありがとうございます。</p>}
              </div>

              <div className="mt-4">
                <button onClick={() => toggleRaw(index)} className="text-sm text-blue-600 underline">
                  {showRawMap[index] ? "ChatGPTの抽出内容を隠す" : "ChatGPTの抽出内容を表示"}
                </button>
                {showRawMap[index] && (
                  <textarea className="w-full h-32 p-2 border rounded mt-2 bg-white" value={result.raw_response} readOnly></textarea>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(submitted && !isLoading && (error || results.length === 0)) && (
        <div className="mt-4 text-red-600 border border-red-300 p-2 rounded bg-red-50">
          {error || "該当する船便がありませんでした。"}
        </div>
      )}
    </div>
  );
}
