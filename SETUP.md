# LINE 監工日誌系統 — 設定指引

> 系統名稱：LINE Supervisor Daily Report  
> 最後更新：2026-06-28

---

## 系統架構

```
承包商 (LINE)
    │
    ▼
LIFF 雙語表單 (GitHub Pages)
    │  填寫完成後：
    │  1. 照片壓縮後上傳 imgBB → 取得 URL
    │  2. 表單資料 + 照片 URLs POST 到 n8n Webhook
    │
    ▼
n8n Cloud Webhook
    │
    ├─► Prepare Data (Code) — 整理資料、組 Gemini prompt
    │
    ├─► Gemini API (gemini-1.5-flash) — 生成中文報告 + 原文報告
    │
    ├─► Parse & Format (Code) — 解析 Gemini JSON 回傳
    │
    ├─► Notion: Save Report — 寫入監工日誌資料庫
    │
    ├─► LINE → Contractor — 推送原文報告給承包商
    │
    └─► LINE → Jerry — 推送中文報告給專案經理
```

---

## 已完成部分 ✅

| 項目 | 狀態 | 備註 |
|------|------|------|
| LIFF 雙語表單 (EN/TH) | ✅ 完成 | GitHub Pages: https://chaiowei.github.io/supervisor-form |
| n8n 工作流程 | ✅ 已匯入 | ID: OCwh63R7TRuPgdDj |
| n8n Webhook URL | ✅ 已設定 | https://jerry-hsieh.app.n8n.cloud/webhook/supervisor-report |
| Notion 資料庫 | ✅ 已建立 | ID: 58c0c3ed5e9a476abd0c4047666d0155 |
| Notion DB ID 寫入工作流程 | ✅ 已硬碼 | Notion: Save Report 節點 |
| index.html Webhook URL | ✅ 已填入 | 已 push 到 GitHub |

---

## 待手動完成 ⚠️

### 步驟 0：重新匯入 n8n 工作流程（**必做**）

> n8n Cloud 的儲存 API 有 401 bug，必須手動重新匯入修正版 JSON。

1. 前往 https://jerry-hsieh.app.n8n.cloud/home/workflows
2. 找到 **Supervisor Daily Report** → 右鍵 → **Delete**（或 Archive）
3. 點右上角 **Add workflow** → **Import from file**
4. 選 `n8n-workflow.json`（本資料夾內）
5. 開啟匯入後的 workflow，繼續步驟 1 設定憑證

> ⚠️ 同步匯入 `n8n-form-options.json`（LINE 表單選項查詢工作流程）

---

### 步驟 1：n8n 設定（兩部分：Credentials + Variables）

前往 Supervisor Daily Report workflow

#### 1-A：Credentials（憑證）— 在節點上設定

**Notion: Save Report 節點**
- 點擊節點 → Credential → 選擇 **Notion2**

**Notion: Get Options 節點**（form-options 鏈的第二個節點）
- 點擊節點 → Credential → 選擇 **Notion2**

---

#### 1-B：Variables（實例變數）— ⚠️ 不是在節點上設，是在 n8n 設定頁

> Gemini 和 LINE 節點使用 `$vars.*` 讀取變數，**不是** 從節點 Credential 讀。

1. 前往 n8n 左側選單 → **Settings** → **Variables**
2. 新增以下四個變數：

| Variable 名稱 | 值 |
|---|---|
| `GEMINI_API_KEY` | 你的 Gemini API Key |
| `LINE_CHANNEL_ACCESS_TOKEN` | 你的 LINE Channel Access Token |
| `JERRY_LINE_USER_ID` | 你的個人 LINE User ID（見下方取得方式）|

> **取得 Jerry LINE User ID**：傳一則訊息給你的 LINE OA，在 n8n executions log 找 `lineUserId` 欄位

---

---

### 步驟 2：LINE Developers — 建立 LIFF App

前往：https://developers.line.biz/console/

1. 選擇你的 LINE Official Account
2. 進入 **LIFF** 分頁
3. 點擊 **Add**
4. 填入：
   - LIFF app name: `監工日誌`
   - Size: **Full**
   - Endpoint URL: `https://chaiowei.github.io/supervisor-form`
   - Scope: `profile` ✅、`openid` ✅
5. 建立後取得 **LIFF ID**（格式：`1234567890-AbCdEfGh`）

---

### 步驟 3：imgBB — 取得 API Key

前往：https://api.imgbb.com/

1. 登入帳號
2. 取得 API Key

---

### 步驟 4：更新 index.html（取得 LIFF ID 和 imgBB Key 後）

編輯 `index.html` 第 340-344 行的 CFG 區塊：

```javascript
const CFG = {
  LIFF_ID:          '填入你的 LIFF ID',
  N8N_WEBHOOK_URL:  'https://jerry-hsieh.app.n8n.cloud/webhook/supervisor-report',  // 已填
  IMGBB_API_KEY:    '填入你的 imgBB API Key',
  MAX_PHOTOS: 10,
  PHOTO_MAX_PX: 1280,
  PHOTO_QUALITY: 0.70,
};
```

然後 push 到 GitHub：
```bash
git add index.html
git commit -m "config: fill LIFF ID and imgBB API key"
git push
```

---

### 步驟 5：啟動工作流程

1. 前往 https://jerry-hsieh.app.n8n.cloud/workflow/OCwh63R7TRuPgdDj
2. 確認所有節點憑證都已設定（節點左上角無紅色警示）
3. 右上角 **Inactive** 切換為 **Active**

---

## 表單使用方式

承包商透過 LINE OA 的 Menu 或 Rich Menu 點擊連結：
```
https://liff.line.me/{LIFF_ID}
```

填寫完成後：
- 承包商收到：英文或泰文版報告
- Jerry 收到：中文版報告
- Notion 資料庫：自動新增一筆紀錄

---

## 支援承包商數量

- 最多 **10 人**（設計無上限，LINE push API 按訊息計費）
- 照片：每次最多 10 張，自動壓縮至 1280px / 70% 品質
