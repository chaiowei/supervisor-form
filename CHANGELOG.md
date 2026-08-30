# 更新紀錄

## 2026-08-30（續）

### Related Work Item 改為自動比對，不需手動維護 Notion 連結
- 原設計預期在 Google Sheets 選項表額外維護一欄「工程名稱→Notion 連結」，但這段前端邏輯從未真正實作，導致 Related Work Item 永遠關聯不到；且這個做法本身也不理想——工程名稱本來就已經是表單既有欄位，不該還要人工重複維護一份連結對照表。
- 改為 n8n 後端自動比對：新增 `Split Project Names` → `Notion: Find Work Item` → `Aggregate Work Item IDs` 三個節點，直接拿送出的工程名稱去 Notion 的 Work Items 資料庫依「名稱」精準比對，找到就自動填入 Related Work Item，完全不需要在 Sheets 或表單裡額外填寫任何連結。
- 前提：Notion 裡的工程名稱要跟表單下拉選單裡的名稱完全一致（含全形/半形、空白），比對不到的話會照舊在 Progress Desc 開頭加提醒文字，需人工確認是否為名稱不一致或該工程尚未在 Notion 建立。

## 2026-08-30

### 修復 Notion 寫入 404（Database ID 與 Data Source ID 搞混）
- `Notion: Create Daily Log1` 節點的 `databaseId` 原本硬編碼填的是「Daily Work Logs」的 **Data Source（collection）ID**（`2190dd6f-6b0a-803a-b151-000bc01c3b86`），但 n8n 建立頁面時需要的是**資料庫本身的 ID**（`2190dd6f-6b0a-80f0-81a4-fe071bce329f`）——這是 Notion 多資料源架構下，同一個資料庫「外殼」跟「底層資料表」被拆成兩個不同 ID 所致，即使分享權限完全正確，用錯 ID 一樣會 404。
- 改成 **URL 模式**（直接貼資料庫網址讓 n8n 自己解析 ID），避免日後再次手動填錯 ID。

## 2026-08-29

### 監工日誌寫入 Notion
- 每筆送出的監工日誌會自動寫入 Notion「Daily Work Logs」資料庫（`Progress Desc`／`Issues Encountered`／`Solutions Applied`／`Photo URLs`）。
- 新增「Related Work Item」自動關聯：依表單送出的工程名稱，自動連到 Work Items 資料庫裡同名的工程頁面；比對不到時會在 Progress Desc 開頭加上提醒文字，需人工確認。
- 翻譯失敗時，Notion 記錄本身也會加上警示前綴，不只 LINE／email 才有提示。

### 工作流程檔案同步
- 將 n8n 上實際運作中的完整工作流程匯出檔同步進 repo：`Supervisor Daily Report v2.json`、`Supervisor Error Notification.json`，取代先前僅記錄局部節點差異的舊版片段檔案。

## 2026-07-06

### PDF 表頭調整
- 中文版 PDF 表頭改回「監工日誌」（`Generate PDF HTML` 節點 `LBL.zh.title`）。英文/泰文版標題與網頁表單本身的頁面標題不受影響。(`969232f`)

### Gemini 升級與翻譯邏輯調整
- `Translate to ZH` 節點模型從 `gemini-2.0-flash` 升級為 `gemini-2.5-flash`。
- **中文表單完全跳過翻譯**：新增 `Is ZH Source?` 判斷節點，`language==='zh'` 時直接繞過 Gemini API 呼叫，避免模型誤改已經正確的中文內容。
- **英文/泰文表單強制完整翻譯**：加強 Gemini prompt，明確要求「輸入可能泰英中混雜，所有非中文部分都要翻完，不可以只翻一部分」。(`c1c60f2`, `33d1a6a`)

### 顯示文字調整
- 所有面向使用者的「監工人員」字樣改為「負責工程師」：網頁表單標題/下拉選單標籤/錯誤訊息/選項載入失敗提示、PDF 欄位標籤、email 通知內文。
- 保留不變：Google Sheets CSV 的 `type` 欄位比對值仍是「監工人員」（資料結構定義，非顯示文字，Sheet 端也維持原樣）。(`33d1a6a`)

### PDF 新增產出時間戳
- PDF 右下角新增淡灰色（`#aaaaaa`）8pt 時間戳，格式 `YYYY-MM-DD HH:mm`，使用 `position:fixed` 讓多頁報告每頁右下角都會顯示。三語皆有對應標籤。(`33d1a6a`)

### P0（高優先）修復
- **草稿自動暫存**：表單文字/下拉輸入自動存 `localStorage`，斷線或送出失敗不會遺失已填內容；重新打開頁面會提示是否恢復草稿（照片不會被儲存，需重新選擇）。
- **照片上傳平行化＋重試**：改為 3 張併發上傳，每張失敗自動重試 2 次，單張失敗不再中斷整份送出。
- **翻譯失敗可見警示**：Gemini 翻譯失敗時，中文 PDF 會加上紅色警示 banner，LINE 給負責工程師的訊息標題與顏色改為警示樣式，email 也同步加上警示文字，不再靜默 fallback 使用原文。(`a15ae91`)

### P1（中優先）修復
- **語言自動偵測**：首次開啟表單依 LINE 使用者語系自動選擇泰/中/英文，不再永遠預設英文（使用者手動切換過的語言會被記住，不會被自動偵測覆蓋）。
- **選項載入失敗可見提示**：Google Sheets 選項 CSV 讀取失敗時顯示可見警示 banner，不再只是 console 靜默失敗。
- **送出前確認頁**：表單驗證通過後先顯示唯讀摘要（含照片張數），使用者按「確認送出」才會真正上傳；送出失敗按「重試」會回到確認頁而非整份重填。
- **天氣改為必填**：上午/下午天氣欄位加入必填驗證。(`a15ae91`)

---

*本檔案記錄面向使用者可見的功能變更；程式碼層級細節與部署狀態另見專案記憶（非公開）。*
