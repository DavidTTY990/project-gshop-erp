# 遊戲店 ERP（game-shop-erp）

為遊戲店打造的簡易 ERP。第一階段將「銷售訂單」與「維修紀錄」數位化保存，介面為繁體中文，支援手機與平板操作。

## 架構

```
瀏覽器（GitHub Pages）
  └─ web/  Vite + React + TypeScript
        │  GET ?action=…  /  POST（JSON 字串，Content-Type: text/plain）
        ▼
Google Apps Script 網頁應用程式
  └─ api/  以 clasp 管理與部署
        │
        ▼
Google Sheets（資料庫，8 張分頁）
```

| 目錄 | 內容 |
|---|---|
| `web/` | 前端，Vite + React（啟用 React Compiler），以 oxlint 檢查 |
| `api/` | 後端，Apps Script 程式碼在 `api/src/`，只有此資料夾會被推送 |

## 第一階段範圍

- **包含**：客戶、機器、銷售訂單與明細、發票、維修單與維修紀錄
- **不包含**：庫存管理、商品主檔、二手收購、部分退貨（退貨只做整筆退）

## 開發環境

- Node.js
- yarn（前後端一律使用 yarn，不要使用 npm）
- 可存取該試算表與 Apps Script 專案的 Google 帳號

## 前端（`web/`）

```bash
cd web
yarn install
yarn dev        # 本機開發
yarn build      # 建置到 dist/
yarn lint       # oxlint
```

在 `web/.env.local` 設定 API 網址（此檔不可提交）：

```
VITE_API_URL=https://script.google.com/macros/s/<部署ID>/exec
```

## 後端（`api/`）

```bash
cd api
yarn install
yarn clasp login   # 首次使用；憑證存在 ~/.clasprc.json，不在 repo 內
```

| 指令 | 用途 |
|---|---|
| `yarn push` | 推送程式碼（`/dev` 測試網址立即生效） |
| `yarn watch` | 存檔自動推送 |
| `yarn deploy` | 推送並更新正式部署（網址不變） |
| `yarn clasp deployments` | 列出部署與其 ID |

注意事項：

- 部署一定要帶 `-i <部署ID>`（`yarn deploy` 已包含）；不帶會產生新網址，前端將連不上。
- 只在本機修改程式碼，`clasp push` 會以本機版本覆蓋線上全部程式碼。
- Apps Script 沒有模組系統：所有 `.js` 共用全域範圍，不可使用 `import`／`export`。

## API

回應格式一律為：

```json
{ "ok": true, "data": … }
{ "ok": false, "error": "錯誤訊息" }
```

目前可用的 action（學習用範例）：

| 請求 | 說明 |
|---|---|
| `GET ?action=ping` | 連線測試 |
| `GET ?action=customers` | 讀取全部客戶 |

## 進度

- [x] Google Sheets schema
- [x] 前端連線到 Apps Script
- [x] 以 clasp 管理後端程式碼
- [ ] 確認 `yarn deploy` 可更新既有部署且網址不變
- [ ] 後端共用骨架（`doPost` 路由、密碼檢查、日期格式化、`LockService`）
- [ ] 客戶、機器、訂單、發票、維修 API
- [ ] 前端各頁面

## 安全性

本 repo 為公開：

- 不可放入真實客戶資料、密碼或 `.env.local`。
- 共用密碼只存放在 Apps Script 的 Script Properties（`API_KEY`）。
- 目前 API 尚無密碼保護，試算表中只放測試資料。
