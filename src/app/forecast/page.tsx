'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';

type WigData = {
  date: string;
  count: number;
};

type MonthlyResult = {
  label: string;
  required: number;
  capacity: string;
  overflow: string;
};

export default function ForecastPage() {
  const [wigData, setWigData] = useState<WigData[]>([]);
  const [modQty, setModQty] = useState<number>(0);
  const [vcaQty, setVcaQty] = useState<number>(0);
  const [monthlyResult, setMonthlyResult] = useState<MonthlyResult[]>([]);
  const [fileName, setFileName] = useState<string | null>(null); // ✅ 追加！

  const handleFile = (file: File) => {
    setFileName(file.name); // ✅ アップロードされたファイル名を保存
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<Record<string, unknown>>) => {
          const parsed: WigData[] = results.data.map((row) => ({
            date: String(row['日付']), // ✅ これで 'unknown' → 'string' 変換OK
            count: parseFloat(String(row['WIG本数（40HQ換算）'] ?? "0")) || 0,
          }));
          setWigData(parsed);
        },
      });
    } else if (ext === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
          const parsed: WigData[] = json.map((row: Record<string, unknown>) => ({
            date: String(row['日付']),
            count: parseFloat(String(row['WIG本数（40HQ換算）'] ?? "0")),
          }));
          setWigData(parsed);
        } catch (err) {
          console.error(err); // ✅ これで unused でなくなる
          alert('Excelの読み込み中にエラーが発生しました');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('CSV または Excel（.xlsx）形式のファイルをアップロードしてください。');
    }
  };

  const handleForecast = () => {
    if (wigData.length === 0) {
      alert('まずはWIGの出荷予定ファイルをアップロードしてください。');
      return;
    }

    const wigTotal = wigData.reduce((sum, d) => sum + d.count, 0);
    const pbDays = wigData.filter((d) => d.count > 0).length;
    const pbCapacity = pbDays * 8;

    const modTotal = modQty / 20;
    const vcaTotal = vcaQty / 20;

    const modPBST = Math.round(modTotal * 0.9 * 10) / 10;
    const modPB = Math.round(modTotal * 0.1 * 10) / 10;
    const vcaFCST = Math.round(vcaTotal * 0.8 * 10) / 10;
    const vcaPB = Math.round(vcaTotal * 0.2 * 10) / 10;

    const PBST = modPBST;
    const FCST = vcaFCST;
    const PB = Math.round((modPB + vcaPB) * 10) / 10;

    const PBST_OVER = Math.max(0, Math.round((PBST - wigTotal) * 10) / 10);
    const PB_OVER = Math.max(0, Math.round((PB - pbCapacity) * 10) / 10);

    const result: MonthlyResult[] = [
      {
        label: "PBST（紙袋パレタイズ）",
        required: PBST,
        capacity: `${wigTotal}本（WIG予定合計）`,
        overflow: PBST_OVER > 0 ? `+${PBST_OVER}本 超過` : "なし",
      },
      {
        label: "FCST（フレコンパレタイズ）",
        required: FCST,
        capacity: "制限なし",
        overflow: "なし",
      },
      {
        label: "PB（バラ積み）",
        required: PB,
        capacity: `${pbCapacity}本（8本 × ${pbDays}日）`,
        overflow: PB_OVER > 0 ? `+${PB_OVER}本 超過` : "なし",
      },
    ];

    setMonthlyResult(result);
  };

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
      <h1 className="text-xl font-bold text-blue-900 mb-4 border-b border-blue-200 pb-1">バンニング見込み予測</h1>

      {/* アップロードセクション */}
      <div className="bg-white rounded-lg border p-5 mb-6 shadow-sm">
        <div className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-4 py-1 rounded-full mb-3">
          WIG バンニング予定
        </div>
        <div className="grid grid-cols-2 gap-6 items-center">
          <div className="text-center text-sm font-semibold text-gray-800 leading-snug">
            ファイルをアップロードしてください<br />
            <span className="text-gray-600 font-normal text-xs">(対応形式：csv/xlsx)</span>
          </div>
          <label htmlFor="fileUpload" className="border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 text-center cursor-pointer px-4 py-6 block transition">
            <span className="text-sm font-medium text-gray-800">
              ここにドラッグアンドドロップ<br />
              または <span className="underline font-semibold">ファイルを選択</span>
            </span>
          </label>
          <input
            id="fileUpload"
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            className="hidden"
          />
        </div>
        {/* ✅ アップロードファイル名表示 */}
        {fileName && (
          <p className="text-sm text-green-700 mt-3 text-center">
            ✅ 「{fileName}」を読み込みました
          </p>
        )}
      </div>

      {/* MOD / VCA 入力欄 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border shadow-sm">
          <div className="text-sm font-semibold text-blue-800 bg-blue-100 px-3 py-1 rounded inline-block mb-2">
            MOD 販売見込数量
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={modQty}
              onChange={(e) => setModQty(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-right"
            />
            <span className="text-sm text-gray-600">MT</span>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border shadow-sm">
          <div className="text-sm font-semibold text-blue-800 bg-blue-100 px-3 py-1 rounded inline-block mb-2">
            VCA 販売見込数量
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={vcaQty}
              onChange={(e) => setVcaQty(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-right"
            />
            <span className="text-sm text-gray-600">MT</span>
          </div>
        </div>
      </div>

      {/* 実行ボタン */}
      <div className="text-center mb-8">
        <button
          onClick={handleForecast}
          className="bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow hover:bg-blue-800 transition"
        >
          バンニング計画を予測する
        </button>
      </div>

      {/* 月次結果テーブル */}
      {monthlyResult.length > 0 && (
        <div className="bg-white border rounded-lg p-4 shadow">
          <h2 className="text-lg font-bold text-blue-900 mb-4">月次バンニング予測結果</h2>
          <table className="min-w-full text-sm border border-gray-300">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-2 py-1 border">荷姿</th>
                <th className="px-2 py-1 border">必要本数</th>
                <th className="px-2 py-1 border">キャパ</th>
                <th className="px-2 py-1 border">超過本数</th>
              </tr>
            </thead>
            <tbody>
              {monthlyResult.map((row, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">{row.label}</td>
                  <td className="border px-2 py-1 text-right">{row.required}</td>
                  <td className="border px-2 py-1 text-right">{row.capacity}</td>
                  <td className={`border px-2 py-1 text-center ${row.overflow.includes('超過') ? 'text-red-600 font-bold' : ''}`}>
                    {row.overflow}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
