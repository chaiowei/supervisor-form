# Notion 整合進度記錄

> 目的：除了現有的 Google Drive PDF，讓 n8n workflow 把每筆監工日誌同時寫進 Notion 的
> `Daily Work Logs` 資料庫，並自動關聯到對應的 Notion 工程頁面（`Related Work Item`）。
> 最後更新：2026-08-19（進行中，尚未完成）

## 已完成

1. **Google Sheets `監工line下拉選單項目` 加了第 6 欄「Notion工程連結」**
   目前唯一的工程「Pelletizer & Pneumatic Conveying System Modification (Plant 1)」
   已對應到 Notion Work Item：
   `https://app.notion.com/2ff0dd6f6b0a80cd972dc041fe44a633`
   （= 「一廠造粒機及氣輸系統改造工程」，Work Item No.93）

2. **`index.html` 已修改並 commit/push**（分支 `claude/latest-workflow-k0hhuc`）
   - 解析 CSV 第 6 欄，存進 `notionUrlByProject`
   - 送出 payload 時新增 `notionProjectUrls`（依選取工程順序組陣列）

3. **PR #1** 目前開著，內容包含：CHANGELOG 補齊、n8n 真實匯出檔同步（含
   `LINE Error Notification.json` 修正為 `active:false` 反映實況）、上述
   `index.html` 改動。狀態：mergeable、無 CI、無 review comment，正每小時自動
   check-in 一次（不會吵你，有變化才會說話）。

4. **n8n 新節點設計（草稿，還沒接好）**
   - `Build Notion Payload`（Code 節點）：組出 `pageTitle`/`logDate`/
     `progressDesc`/`issuesEncountered`/`solutionsApplied`/`photoUrls`/
     `relatedWorkItemIds`（陣列，從 `notionProjectUrls` 動態算出 Notion page
     ID，查不到就跳過不擋流程）
   - `Notion: Create Daily Log`（原生 Notion 節點，Database Page → Create）
   - 已傳給你兩個檔案：
     - `notion-nodes.json` / 舊版 `TEMP-notion-nodes-workflow.json`（HTTP
       Request 版本，已棄用，卡在 401）
     - `TEMP-notion-nodes-workflow-v2.json`（改用原生 Notion 節點的版本，
       目前使用中）
   - `Notion: Create Daily Log` 節點的 code 已在畫布上，且已用
     `build-notion-payload-v2.js` 取代過

## 目前卡住的地方

**錯誤**：`404 - Could not find database with ID: 2190dd6f-6b0a-803a-b151-000bc01c3b86`

**原因**：節點的 Credential 選成 `Notion2`，但這組 credential 綁定的 Notion
integration 是 **「轉錄紀錄」**（舊的、給「會議轉錄系統」用的），不是我們設定、
且已經加進 `Daily Work Logs` Connections 的 **「My API Integration」**。
Database ID 本身沒錯，是 credential 對錯 integration。

**下一步（兩選一，還沒做）**：
- 選項一（建議）：在這個節點重新建一組 credential，貼 **My API Integration**
  的 secret，換掉 `Notion2`
- 選項二：把 `Daily Work Logs` 資料庫的 Connections 也加入 **轉錄紀錄**
  這個 integration

修好這個 404 之後：
1. 重新執行節點，確認 `名稱`/`Log Date`/`Progress Desc` 等欄位有正確寫入
2. 確認 `Related Work Item` 有正確關聯到「一廠造粒機及氣輸系統改造工程」
3. 接線：從 `Set Drive Permission` 拉一條線到 `Build Notion Payload`（目前
   應該還沒接到主流程上，是獨立測試中）
4. 全部測過沒問題後，把 workflow 存檔 active，並匯出真實版本回傳給我同步
   進 GitHub repo（比照之前 `LINE Form Options 2.json` 的做法）
5. 之後可以再考慮加「頁面內文分段內容」（施工部位/天氣/今日施工項目...那種
   heading+paragraph 結構），這個目前刻意先跳過，只寫資料庫欄位

## 重要參考資訊

- `Daily Work Logs` data source ID：`2190dd6f-6b0a-803a-b151-000bc01c3b86`
- `Work Items` data source ID（Related Work Item 關聯到這個）：
  `2190dd6f-6b0a-80de-a93b-000bc5c1fc4e`
- Notion Work Item 頁面 ID 格式：Google Sheets 存完整 URL（例如
  `https://app.notion.com/2ff0dd6f6b0a80cd972dc041fe44a633`），n8n 的
  `Build Notion Payload` 節點會自己轉成 relation 要的 dashed UUID 格式
- Notion 資料庫欄位（`Daily Work Logs`）：`名稱`(title)、`Log Date`(date)、
  `Related Work Item`(relation)、`Progress Desc`/`Issues Encountered`/
  `Solutions Applied`/`Photo URLs`(rich_text)、`Ready`(checkbox，目前沒自動
  設定，留給人工審核用)
- Google Drive PDF 流程維持不變，Notion 是**新增**的並行分支，不是取代
