# LINE 監工日誌系統 — 設定指引

> 最後更新：2026-10-05

---

## 系統架構

```
承包商／負責工程師 (LINE)
    │  開啟 LIFF 表單 https://liff.line.me/2010536222-MhPB41l8
    ▼
LIFF 三語表單 index.html（GitHub Pages: https://chaiowei.github.io/supervisor-form）
    │  1. 從 Google Sheets 選項表讀取 工程師 → 廠商 → 工程 下拉選單
    │  2. 照片壓縮後逐張 POST 到 n8n「Supervisor Photo Upload」→ 存 Google Drive，回傳圖片網址
    │  3. 照片全部成功後，表單資料 + 照片網址 POST 到 n8n「Supervisor Daily Report v2」
    ▼
n8n「Supervisor Daily Report v2」（webhook: supervisor-report）
    ├─ Prepare Data — 整理資料；同一個 submissionId 重複送出時直接略過（防重複報告）
    ├─ Translate to ZH — 泰／英文才翻譯（Gemini），中文直接跳過
    ├─ Generate PDF HTML → PDF.co → Google Drive（承包商語言版 + 中文版）
    ├─ Build Notion Payload → Notion: Create Daily Log（Daily Work Logs 資料庫）
    │     ├─ Build Photo Blocks → Notion: Append Photos（照片直接顯示在頁面裡）
    │     └─ Build Messages
    │           ├─ LINE → Contractor（承包商語言版：下載 PDF／分享）
    │           ├─ LINE → Jerry（中文版：下載 PDF／分享／Notion 頁面）
    │           └─ Email → 負責工程師（中文 PDF + Notion 連結）
    └─ 任何節點失敗 → 「Supervisor Error Notification」用 LINE 通知 Jerry
```

---

## repo 檔案

| 檔案 | 用途 |
|------|------|
| `index.html` | LIFF 表單（GitHub Pages 直接發布 master 分支） |
| `privacy.html` | 隱私權政策頁（Google OAuth 正式版需要） |
| `Supervisor Daily Report v2.json` | n8n 主流程匯出檔 |
| `Supervisor Photo Upload.json` | n8n 照片上傳流程（照片 → Google Drive） |
| `Supervisor Error Notification.json` | n8n 錯誤通知流程 |
| `Migrate imgBB Photos to Drive.json` | 一次性流程：把舊 imgBB 照片搬到 Drive（已用不到，保留備查） |
| `n8n-snippets/*.js` | 主流程各 Code 節點的最新程式碼，修改 n8n 時直接整段貼上 |
| `LINE Form Options 2.json` | 舊版主流程備份（名稱有誤，非選項流程） |

> repo 裡的 n8n JSON 是備份，**實際運作的是 n8n 上的版本**。改了 n8n 之後記得同步回 repo（匯出或請 Claude 更新）。

---

## Google Sheets 選項表

表單的下拉選單來自「發布到網路」的 Google Sheets CSV（網址在 `index.html` 的 `CFG.OPTIONS_URL`）。第一列是標題，從第二列開始每列一筆：

| 欄 | 名稱 | 說明 |
|----|------|------|
| 1 | 名稱 | 顯示在下拉選單的文字（可含逗號） |
| 2 | 類型 | `監工人員`、`施工廠商` 或 `工程名稱`（比對用，不可改字） |
| 3 | 啟用 | `TRUE` 才會出現在選單 |
| 4 | Email | 監工人員列：報告 Email 寄給誰 |
| 5 | 上層 | 施工廠商列填所屬工程師名稱；工程名稱列填所屬廠商名稱 |
| 6 | Notion工程連結 | 工程名稱列：該工程在 Notion Work Items 的頁面連結，用來自動關聯 Related Work Item |

中文版 LINE 報告只推播給 Jerry（且僅限 Jerry 為該工程師的 Email 收件人時）；其他負責工程師收 Email。

---

## n8n 工作流程與憑證

n8n Cloud：https://jerry-hsieh.app.n8n.cloud

| 流程 | 狀態 | 需要的憑證 |
|------|------|-----------|
| Supervisor Daily Report v2（ID `OCwh63R7TRuPgdDj`） | Active | Google Drive account、Notion work、Gmail account、LINE（Header Auth `Authorization: Bearer <channel access token>`）、PDF.co、Gemini |
| Supervisor Photo Upload | Active | Google Drive account |
| Supervisor Error Notification | Active，並在主流程 Settings → Error workflow 指定 | LINE |

**Google Drive／Gmail 授權不會每 7 天過期的前提：** Google Cloud（My First Project）→ Google Auth Platform → 目標對象 → 發布狀態必須是「**實際運作中**」。若改回「測試」，授權會每 7 天失效，照片會全部上傳失敗、報告送不出去。

**Notion：** 「Daily Work Logs」資料庫與 Work Items 資料庫都要在 Notion 的 Connections 分享給 n8n 使用的 integration（目前叫「工作首頁」），否則會 404。資料庫網址用 URL 模式填，別誤填 Data Source ID。

---

## 修改 n8n 主流程 Code 節點的方式

1. 打開 `n8n-snippets/` 裡對應的檔案（例如 `Build Messages.js`），全選複製
2. n8n 打開 Supervisor Daily Report v2 → 雙擊同名節點 → 程式碼框全部取代 → Save
3. 送一份測試日誌確認

---

## 照片儲存

- 新照片：Google Drive「工作日誌 › 工程照片---from 廠商」（在 Supervisor Photo Upload → Drive: Upload Photo 設定資料夾）
- 檔名：`日期_廠商_時分秒_序號.jpg`
- 舊 imgBB 照片已搬到同一資料夾（`imgbb_###.jpg` 與 `日期_序號.jpg`）；確認無誤後可到 imgBB 停用舊的 API Key

---

## 常見問題

| 狀況 | 可能原因 |
|------|---------|
| 表單顯示「照片上傳失敗」 | Google Drive 授權失效（n8n → Credentials → Google Drive account 重新連結）、Supervisor Photo Upload 沒有 Active、工地網路不穩（錯誤頁紅字下方有原因） |
| 表單成功但沒收到 LINE | LINE 官方帳號當月推播額度用完、承包商沒加官方帳號好友；n8n Executions 可看細節 |
| Notion 沒有新頁面 | Notion integration 沒分享到資料庫；LINE 仍會照常發送（只是少了 Notion 按鈕） |
| 同一份報告出現兩次 | 正常情況下已由 submissionId 擋掉；若仍發生，檢查 Prepare Data 是否為 `n8n-snippets/Prepare Data.js` 的最新版 |
