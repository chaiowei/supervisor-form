# 交接文件：LINE 監工日誌系統（給接手的 AI／工程師）

> 寫於 2026-11-12。這份文件讓 GPT 等其他 AI 不看對話紀錄也能接手。
> 使用方式：把這份檔案（加上要修改的檔案）整份貼給 AI，再說明要改什麼。
> 細節以 `SETUP.md`（設定）與 `CHANGELOG.md`（歷次修改原因）為準。

---

## 1. 系統在做什麼

泰國工地的承包商在 LINE 裡開網頁表單，回報每日工作。有兩個表單：

| 表單 | 檔案 | 用途 | 後端 n8n 流程 |
|------|------|------|---------------|
| 監工日誌（完整版） | `index.html` | 基本資料、天氣、危險作業、工作內容、照片 | `Supervisor Daily Report v2`（webhook `supervisor-report`）：翻譯 → PDF → Drive → Notion → LINE／Email |
| 現場照片回報 | `photo.html` | 只有基本資料與照片 | `Supervisor Photo Report`（webhook `supervisor-photo-report`）：**只發 LINE**，沒有 PDF、Email、Notion |

兩個表單共用：
- 照片上傳：`Supervisor Photo Upload`（webhook `supervisor-photo`）→ Google Drive「工作日誌 › 工程照片---from 廠商 › <工程名稱>」，回傳 `https://lh3.googleusercontent.com/d/<fileId>`
- 錯誤回報：`Supervisor Error Notification`（webhook `supervisor-form-error`）→ LINE 通知 Jerry（照片表單的錯誤訊息以「[照片表單]」開頭）
- 下拉選項：Google Sheets 發布的 CSV（`CFG.OPTIONS_URL`），階層為 負責工程師 → 施工廠商 → 工程名稱（可複選）

## 2. 技術環境

- 前端：單一 HTML 檔，純 JavaScript，沒有 build 工具。用 GitHub Pages 發布 `master` 分支：`https://chaiowei.github.io/supervisor-form/`
- LINE LIFF ID：`2010536222-MhPB41l8`
  - 完整版：`https://liff.line.me/2010536222-MhPB41l8`
  - 照片版：`https://liff.line.me/2010536222-MhPB41l8/photo.html`
- 後端：n8n Cloud `https://jerry-hsieh.app.n8n.cloud`。repo 裡的 `*.json` 只是備份，**實際運作的是 n8n 上的版本**
- 語言：表單有英文、泰文、中文三語（`T = { en, th, zh }`），通知給 Jerry 的一律用中文
- Jerry 的 LINE userId 寫在各個 `Build Messages` 程式碼裡（`Ubf65144...`）

## 3. 修改規則（很重要）

1. **每次改 `index.html` 或 `photo.html`，都要更新該檔的 `APP_VERSION`**（照片版以 `photo-` 開頭，例如 `photo-2026-11-12.2`）。LINE 內建瀏覽器會快取舊網頁，表單是靠比對版本號來自動重新載入的。
2. 兩個表單在同一個網域，所以 localStorage 是共用的：
   - 照片版自己的 key：`wl_photo_draft_v1`、`wl_photo_err_queue`，sessionStorage 的 `wl_photo_reload_for`
   - 兩邊共用、而且是刻意共用的 key：`wl_lang`、`wl_fs`、`wl_options_csv`、`wl_last_selection`
   - 新增 key 時不要跟另一個表單撞名
3. n8n Code 節點的最新程式碼放在 `n8n-snippets/`（完整版）與 `n8n-snippets/photo-report/`（照片版）。改了程式碼要同步更新對應的 workflow JSON。
4. 完整版主流程的節點名稱結尾有「1」（例如 `Prepare Data1`），程式碼用 `$('…')` 引用這些名字，**不要改名**。照片版的節點名稱沒有「1」。
5. 錯誤一定要讓 Jerry 知道：失敗時呼叫 `reportError(kind, message, extra)`，不要默默吞掉。
6. 使用者在工地，網路很差：所有 fetch 都要有逾時與重試；重送時要沿用同一個 `submissionId`（n8n 的 Prepare Data 會用它擋掉重複的報告）。
7. 使用者多半年紀較大、用 Android（Samsung）手機：
   - HEIC 照片要轉檔、讀不到的 JPG 要補救（`processPickedPhotos`、`recoverUndecodable`），這些邏輯不要拿掉
   - 文字大小由 `--fs` 控制
8. Notion 的欄位名稱（只有完整版使用）不要改，改了要同步改 `Build Notion Payload.js`。

## 4. photo.html 的流程

1. 載入時讀取選項 CSV（15 秒逾時，失敗時改用手機快取）、自動帶入上次選的工程師、廠商、工程、檢查草稿、檢查新版本，並用 `liff.init` 取得 `lineUserId`。
2. 選照片時逐張檢查能不能讀取（最多重試 3 次）。HEIC 會轉成 JPEG，讀不到的會嘗試補救，最多 20 張。
3. 按送出 → 驗證必填欄位（至少 1 張照片）→ 顯示確認頁 → 確認送出。
4. 照片壓縮到 1280px、品質 0.7 → 每次 3 張平行上傳（第一張單獨先上傳，避免 Drive 重複建立資料夾）。每張重試 3 次，已上傳成功的照片會記住，重送時不會再傳。
5. 把下面的 JSON POST 到 `supervisor-photo-report`（60 秒逾時）：

```json
{
  "supervisor": "...", "contractor": "...", "projectName": "A, B", "constructionArea": "...",
  "date": "YYYY-MM-DD", "lineUserId": "U...", "lineDisplayName": "...",
  "supervisorEmail": "...", "submissionId": "uuid", "language": "en|th|zh",
  "submittedAt": "ISO", "filledAtLocal": "2026/11/12 09:01:02 (Asia/Bangkok, UTC+7)",
  "filledDate": "YYYY-MM-DD", "photoUrls": ["https://lh3.googleusercontent.com/d/..."],
  "photoCount": 3, "skippedPhotoCount": 0, "reportType": "photo"
}
```

## 5. n8n「Supervisor Photo Report」流程

```
Webhook (POST supervisor-photo-report)
  → Prepare Data      依 submissionId 去重（保留 3 天）、填寫時間、補填判斷、星期幾
  → Build Messages    組 LINE Flex 輪播：第 1 格是摘要，之後每張照片一格（點照片開原圖）
      ├→ LINE → Contractor  推播給填寫者（continue on fail：對方沒加好友也不影響）
      └→ LINE → Jerry       中文版，失敗重試 3 次
```
- LINE 推播使用 `https://api.line.me/v2/bot/message/push`，憑證是 Header Auth「Header Auth account 2」（`Authorization: Bearer <channel access token>`）
- Workflow 設定的 Error workflow 是 `Supervisor Error Notification`（ID `LhO1L9YtYPahglea`）
- 表單最多 20 張照片。LINE 輪播一則最多 12 格，所以拆成兩則：第 1 則是摘要＋照片 1–11，第 2 則是照片 12–20

## 6. 測試方式

- 本機測試前端：用 Playwright 開 `photo.html`，攔截 `docs.google.com`（回傳假的 CSV）、`supervisor-photo`、`supervisor-photo-report`、`supervisor-form-error` 這幾個請求。LIFF 載入失敗時，程式會自動進入 dev 模式（`lineUserId = dev_xxx`）。
- 測試 n8n Code 節點：把程式碼包成 `new Function('$input','$','$getWorkflowStaticData', code)`，餵入假資料用 Node 執行。
- 正式測試：用手機開 LIFF 連結送一份，到 n8n → Executions 查看執行結果。

## 7. 已知待確認事項

- `photo.html` 的 LIFF 子路徑能不能用，要看 LINE Developers 裡 LIFF 的 Endpoint URL 是不是資料夾網址（見 `SETUP.md`）
- LINE 輪播顯示 `lh3.googleusercontent.com` 圖片的方式，正式上線後要實際確認一次

## 8. 檔案一覽

| 檔案 | 說明 |
|------|------|
| `index.html` | 完整版表單 |
| `photo.html` | 照片版表單 |
| `richmenu-2500x843.png` | LINE 圖文選單圖片（左：每日日誌 `index.html`；右：照片回報 `photo.html`） |
| `privacy.html` | 隱私權政策 |
| `Supervisor Daily Report v2.json` | 完整版 n8n 主流程 |
| `Supervisor Photo Report.json` | 照片版 n8n 流程 |
| `Supervisor Photo Upload.json` | 照片上傳到 Drive（兩個表單共用） |
| `Supervisor Error Notification.json` | 錯誤通知（兩個表單共用） |
| `n8n-snippets/*.js`、`n8n-snippets/photo-report/*.js` | 各 Code 節點的程式碼 |
| `SETUP.md` | 設定、憑證、常見問題 |
| `CHANGELOG.md` | 每次修改的內容與原因 |
