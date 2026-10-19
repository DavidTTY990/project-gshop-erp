# 遊戲店 ERP（game-shop-erp）

為朋友的遊戲店打造的簡易 ERP。第一階段只把「銷售訂單」與「維修紀錄」數位化保存。
介面以**繁體中文**為主。

完整 schema 文件：https://claude.ai/code/artifact/f28ed7f8-acd3-43e8-8233-f1279c84c8fb

## 技術架構

- **資料庫**：Google Sheets（8 張分頁）
- **後端**：Google Apps Script 網頁應用程式（`doGet` / `doPost`），位於 `api/`，以 clasp 管理與部署
- **前端**：Vite + React + TypeScript（啟用 React Compiler，以 oxlint 檢查）、react-router（`HashRouter`）、Tailwind CSS v4 + shadcn/ui、TanStack Query、sonner，以 GitHub Actions 部署到 GitHub Pages
- **套件管理**：前後端一律使用 **yarn 4.12**（corepack，`packageManager` 欄位），不要使用 npm；兩邊都設定 `nodeLinker: node-modules`

## 開發流程

1. **構想**：使用者以文字描述頁面設計／操作流程／資料操作，Claude 提出行動計畫（含需由使用者手動修改試算表的步驟）。
2. **確認細節**：使用 `grilling` skill 交叉詢問；結束後 Claude 整理定案計畫，使用者回覆同意後才開始實作。
3. **實作**：從最新 `master` 開新分支，一個功能一個分支。分支命名 `feature/<簡述>`、`fix/<簡述>`、`setting/<簡述>`。
   - 後端以 `yarn deploy:staging` 更新**測試部署**供驗證；Claude **不得**執行 `yarn deploy`（正式部署）。
   - 完成前自我檢查：`web/` 執行 `yarn lint`、`yarn build`；`api/` 執行 `yarn clasp show-file-status`。
   - 完成後提供驗證清單（操作步驟、預期結果、需事先準備的試算表測試資料），等待使用者以 `yarn dev:staging` 驗證。
4. **提交**：驗證通過後 commit 並以 `gh` 開 PR（描述含變更摘要、手動步驟、驗證清單），同一 PR 更新本檔「目前進度」與相關說明。
   - commit 格式：`[FEATURE]`／`[FIX]`／`[SETTING]` + 簡述
   - **commit 訊息、PR 標題與描述不得出現任何與 Claude 或 AI 相關的字樣或署名（含 `Co-Authored-By`、「Generated with Claude Code」）**
5. **合併與部署**：由使用者手動 merge 並執行 `yarn deploy`（`web/` 於 merge 後由 GitHub Actions 自動部署）。Claude 不執行 merge，也不更新正式部署。

### 使用測試部署驗證

- **Claude**：在功能分支的 `api/` 執行 `yarn deploy:staging`，通知使用者並附驗證清單；修正後再次執行即可（使用者重新整理頁面）。
- **使用者**：`git checkout <分支>` → `web/` 執行 `yarn dev:staging` → 依清單操作。`yarn dev` 連的是正式部署（舊後端），驗證新後端必須用 `yarn dev:staging`。
- 只改前端時不需要測試部署，用 `yarn dev` 驗證即可。
- 測試部署只有一個，反映最後一次 `deploy:staging` 的分支；一次只驗證一個功能。
- 手機／平板測試需 `yarn dev:staging --host`，且 WSL2 需另外設定連接埠轉發。

### 正式上線（使用者執行）

```bash
git checkout master && git pull
cd api && yarn deploy
```

- **務必先切回 `master` 並 pull**：`clasp push` 推送的是本機目前的檔案，不是 GitHub 上的 `master`。

## 目前進度

- [x] Google Sheets schema 已建立
- [x] 前端已能連線到 Apps Script 網頁應用程式
- [x] `api/` 已用 clasp clone 下線上腳本
- [x] 確認 `yarn deploy` 流程可更新既有部署且網址不變
- [x] 後端共用骨架（`doPost` 路由、`checkAuth`、日期格式化、`withLock`、統一回應格式）
- [x] 登入頁（帳密＋選擇店員）、共用版面、路由保護；其餘頁面為「建置中」
- [ ] 實作客戶、機器、訂單、發票、維修各 API
- [ ] 前端各頁面（順序：客人 → 維修 → 訂單 → 首頁搜尋）

## 後端（`api/`）

### 資料夾結構

```
api/
├── .clasp.json        ← 指令碼 ID 與 rootDir（rootDir 固定為 src）
├── .claspignore       ← 推送白名單（路徑以 rootDir 為基準）
├── .yarnrc.yml        ← nodeLinker: node-modules
├── .env.local         ← DEPLOYMENT_ID、STAGING_DEPLOYMENT_ID（不提交；範本為 .env.example）
├── package.json       ← clasp 為 devDependency
├── yarn.lock
├── .yarn/             ← yarn 狀態檔，不提交
├── node_modules/
└── src/               ← 只有這裡的檔案會被推送到 Apps Script
    ├── appsscript.json
    ├── main.js        ← doGet（僅 ping）、doPost、handleRequest、ACTIONS 路由表
    ├── auth.js        ← checkAuth
    ├── utils.js       ← readSheet、jsonResponse、formatDate、withLock
    └── settings.js    ← getSettings
```

- 後端程式碼資料夾**固定命名為 `src/`**。
- 所有 clasp／yarn 指令都在 `api/` 執行。
- 檔名使用英文；新增功能時依領域拆檔（例：`customers.js`、`repairs.js`）。Apps Script 線上檔名即本機檔名去掉副檔名，改名後 `clasp push` 會刪除線上舊檔，不影響部署網址。
- `.claspignore` 的路徑**以 `rootDir`（`src/`）為基準**，不是以 `api/` 為基準；寫成 `!src/**` 會匹配不到任何檔案，導致 `.js` 不被推送、線上程式碼被清空。修改後先用 `yarn clasp show-file-status` 確認所有 `.js` 都在 Tracked files。

### 常用指令

| 指令 | 用途 |
|---|---|
| `yarn push` | 推送程式碼（`/dev` 測試網址立即生效，`/exec` 不變） |
| `yarn watch` | 存檔自動推送 |
| `yarn deploy` | 推送、建立新版本並更新正式部署 `/exec`（網址不變；僅使用者執行） |
| `yarn deploy:staging` | 推送、建立新版本並更新測試部署 `/exec`（驗證分支功能用） |
| `yarn clasp deployments` | 列出部署與其 ID |
| `yarn clasp pull` | 把線上版本拉回本機（僅在有人改過線上編輯器時使用） |

`package.json` scripts：

```json
{
  "scripts": {
    "push": "clasp push",
    "watch": "clasp push --watch",
    "check-deploy-id": "grep -qE '^DEPLOYMENT_ID=AKfy' .env.local 2>/dev/null || (echo '❌ …' && exit 1)",
    "deploy": "yarn check-deploy-id && clasp push && clasp deploy -i $(grep '^DEPLOYMENT_ID=' .env.local | cut -d= -f2)",
    "check-staging-id": "…（同上，檢查 STAGING_DEPLOYMENT_ID）",
    "deploy:staging": "yarn check-staging-id && clasp push && clasp deploy -i $(grep '^STAGING_DEPLOYMENT_ID=' .env.local | cut -d= -f2)"
  }
}
```

- 正式部署 ID 存在 `api/.env.local` 的 `DEPLOYMENT_ID`，測試部署 ID（描述為 `staging`）存在 `STAGING_DEPLOYMENT_ID`，皆不提交到 Git。`check-*` 會在未設定時中止，避免 `-i` 帶空值而建立新部署。
- `grep` 必須寫成 `'^DEPLOYMENT_ID='` 錨定行首，否則會同時抓到 `STAGING_DEPLOYMENT_ID`。
- 舊部署 ID 曾出現在 Git 歷史中，該部署已封存。API 網址仍可從前端打包後的 JS 看到，因此 `checkAuth()` 必須在試算表放入真實資料**之前**完成。

### `/exec` 與 `/dev`

| | `/exec`（正式部署） | `/dev`（測試部署，`@HEAD`） |
|---|---|---|
| 執行的程式碼 | 固定版本 | 最新推送的程式碼 |
| 更新方式 | `yarn deploy` | `yarn push` 後立即生效 |
| 存取 | 任何人，不需登入 | 僅限有編輯權且已登入的 Google 帳號 |

- 開發流程：`yarn push` → 在線上編輯器執行 `test_xxx()` 測試 → `yarn deploy:staging` → 前端 `yarn dev:staging` 驗證 → merge 後使用者執行 `yarn deploy`。
- 測試部署與正式部署是兩個獨立的 `/exec`，各自綁定固定版本；`clasp push` 與 `yarn deploy:staging` 都不影響正式部署。兩者目前讀寫**同一份試算表**，放入真實資料後需改用測試試算表。
- 前端 `VITE_API_URL` **一定用 `/exec`**；`/dev` 會被導向 Google 登入頁，前端呼叫不了。
- 除了 `?action=ping`，所有 API 都是 POST，無法在網址列測試，用 `test_xxx()` 函式在線上編輯器執行。

### 重要規則

- **指令碼 ID ≠ 部署 ID**
  - 指令碼 ID：代表整個專案，已存在 `.clasp.json`，`clasp clone` 用它。
  - 部署 ID：代表某一次對外發布，即前端 `VITE_API_URL` 中 `/s/` 與 `/exec` 之間那串，`clasp deploy -i` 用它。
- **部署一定要帶 `-i <部署ID>`**。不帶會建立新部署並產生新網址，前端會連不上。
- **只在本機修改程式碼**。`clasp push` 會用本機版本覆蓋線上全部程式碼。
- **Apps Script 沒有模組系統**：所有 `.js` 檔共用全域範圍，不可使用 `import`／`export`，函式名稱不可重複。沒有 npm 套件、`fetch`（改用 `UrlFetchApp`）、`setTimeout`。
- **讀寫試算表要批次處理**：用 `getDataRange().getValues()` 一次讀整張表、用 `setValues()` 或 `appendRow()` 寫入；不要在迴圈中逐格讀寫。
- **把邏輯與 HTTP 分開**：例如 `createCustomer(data)` 搭配 `test_createCustomer()`，可在線上編輯器直接執行測試。
- **`doGet` / `doPost` 外層一律包 `try/catch`**，錯誤轉成 `{ ok: false, error }` 回傳。
- 部署後的錯誤記錄在 Apps Script 編輯器的「執行項目」頁面。

### `src/appsscript.json`

```json
{
  "timeZone": "Asia/Taipei",
  "dependencies": {},
  "runtimeVersion": "V8",
  "exceptionLogging": "STACKDRIVER",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

### Git

- 可提交：`src/`、`.clasp.json`、`.claspignore`、`.yarnrc.yml`、`.env.example`、`package.json`、`yarn.lock`
- 不可提交：`node_modules/`、`.yarn/`（根目錄 `.gitignore` 已排除）、任何密碼。clasp 登入憑證在家目錄（`~/.clasprc.json`），不在 repo 內。
- 共用帳密只存在線上的 Script Properties（`API_USER`、`API_KEY`；Apps Script 編輯器 → 專案設定 → 指令碼屬性），修改後立即生效、不需重新部署。正式與測試部署共用同一組。

## 第一階段範圍

- 包含：客戶、機器、銷售訂單與明細、發票、維修單與維修紀錄
- 不包含：庫存管理、商品主檔、二手收購、部分退貨（退貨只做整筆退）

## Schema 摘要

第 1 列為英文欄位名稱；程式一律依標題名稱找欄位，不依賴欄位位置。

- **Customers**：customer_id, name, phone, line_id, note, created_at, updated_at
- **Devices**：device_id, serial_no, device_type, brand, device_model, note, created_at, updated_at
- **Orders**：order_id, customer_id, order_date, subtotal, discount, total, payment_method, status, returned_at, return_reason, staff, note, created_at, updated_at
- **OrderItems**：item_id, order_id, invoice_id, product_name, category, platform, condition, unit_price, qty, line_total, note
- **Invoices**：invoice_id, invoice_no, source_type, source_id, invoice_date, amount, buyer_tax_id, invoice_status, note, created_at, updated_at
- **Repairs**：repair_id, customer_id, device_id, received_at, accessories, intake_condition, issue, diagnosis, status, quote_amount, final_amount, deposit, is_paid, estimated_done_date, completed_at, picked_up_at, technician, note, created_at, updated_at
- **RepairLogs**：log_id, repair_id, status, note, staff, created_at
- **Settings**：下拉選項清單（category, platform, condition, payment_method, order_status, repair_status, source_type, invoice_status, device_type, brand, staff）；每欄一種選項，第 1 列為欄名，往下每列一個值，各欄長度可不同

## 資料慣例

- 選項值存中文（例：維修狀態「維修中」）
- 金額為新台幣整數
- 日期時間格式 `yyyy-mm-dd hh:mm`，時區 Asia/Taipei；回傳前端前先格式化，避免變成 UTC
  - `jsonResponse()` 會把回應中所有 `Date` 經 `formatDate()` 轉成字串，所有 API 回應都必須經過它
  - 試算表中只有日期的儲存格也會讀成 `Date`，會輸出為 `yyyy-mm-dd 00:00`
  - 前端送來的日期字串寫入前也要確認格式一致（新增寫入 API 時留意）
- 主鍵由後端產生：前綴-日期-流水號，例 `O-20261018-001`、`R-…`、`C-…`、`D-…`、`INV-…`
- `_id`、電話、序號、發票號碼、統編皆為純文字

## 業務規則（後端負責）

- `line_total = unit_price × qty`；`subtotal` 為明細加總；`total = subtotal − discount`
- 一筆訂單可有多張發票；每個品項只屬於一張發票（`OrderItems.invoice_id`）；同一品項不可拆到兩張發票
- 銷售發票的 `amount` 為所屬品項 `line_total` 加總
- 一筆維修單只對應一張發票（`source_type` = 維修）
- `invoice_no` 格式規則待確認，目前試算表與後端皆不做驗證，可留空
- 退貨：訂單 `status` 改「已退貨」並填 `returned_at`、`return_reason`，發票改「作廢」或「折讓」
- `serial_no` 正規化（大寫、去空白與連字號），有填則唯一
- Devices 不記錄客戶；「客人送修過哪些機器」由 Repairs 的 `customer_id` + `device_id` 查出
- 建立維修單時，先列出該客人過去送修過的機器供選擇，避免重複建立
- 每次變更 `Repairs.status` 同時新增一筆 RepairLogs
- 寫入時使用 `LockService` 避免同時寫入衝突

## API 慣例

- 回應格式一律為 `{ ok: true, data }` 或 `{ ok: false, error }`（Apps Script 無法設定 HTTP 狀態碼）
- 讀寫一律 `POST`（避免密碼出現在網址），body 為 JSON 字串 `{ action, auth: { user, key }, params }`，`Content-Type` 必須是 `text/plain`，以避開 CORS preflight
  - 唯一的 GET 是不需驗證的 `?action=ping`，用來確認後端是否正常
  - 新增 API：寫好處理函式（接收 `params`），在 `main.js` 的 `ACTIONS` 登記
- 驗證：`doPost` → `handleRequest` 先呼叫 `checkAuth()`，與 Script Properties 的 `API_USER`、`API_KEY` 比對；失敗時延遲 1 秒並回傳 `{ ok: false, error: '帳號或密碼錯誤', code: 'AUTH' }`。日後可換成 Google 登入
- 已有的 action：`login`（只驗證帳密）、`settings`（回傳 `{ staff: [...], category: [...], ... }`）

## 前端注意事項

- API 網址放在 `.env.local` 的 `VITE_API_URL`（不可提交到 Git；範本為 `web/.env.example`）
  - 測試部署網址放在 `web/.env.staging.local`，以 `yarn dev:staging`（`vite --mode staging`）啟動時優先採用
- GitHub Pages 無伺服器端路由：使用 `HashRouter`（從 `react-router` 匯入），`vite.config.ts` 的 `base` 為 `/project-gshop-erp/`
  - `base` 下引用 `public/` 檔案不可寫絕對路徑 `/xxx`；在程式中用 `import` 或 `import.meta.env.BASE_URL`
- 路由（`App.tsx`）：`/login` 不需登入；其餘包在 `RequireAuth`（未登入或未選店員 → `/login`，登入後回原頁）與 `Layout`（頁首；`md` 以下為漢堡選單）內
- 部署：`.github/workflows/deploy-web.yml`，push 到 `master` 且 `web/` 有變更時自動建置並部署
  - CI 的 API 網址來自 repo 的 Actions **Variable** `VITE_API_URL`（不是 Secret；網址本來就會出現在打包後的 JS）
  - repo 的 Settings → Pages → Source 需設為「GitHub Actions」
  - 本機確認：`yarn build && yarn preview`，開 `http://localhost:4173/project-gshop-erp/`
- Apps Script 回應約 1～3 秒，所有請求都需要載入狀態
- 介面文字為繁體中文；英文欄位名稱需對應中文標籤
- **響應式設計**：每個頁面都必須同時支援電腦、平板、手機（櫃台常用手機或平板）；按鈕與輸入框要夠大好點擊
- UI：Tailwind CSS v4 + shadcn/ui（`yarn dlx shadcn@latest add <元件>`，產生於 `src/components/ui/`）；只做淺色模式、使用系統字型；匯入路徑別名 `@/` = `src/`
- 呼叫後端一律用 `src/lib/api.ts` 的 `callApi(action, params)` 搭配 TanStack Query：
  - 自動帶入已登入的帳密；收到 `AUTH` 會清除登入狀態並導回登入頁
  - 錯誤由 `queryClient` 統一以 sonner 通知顯示；只重試網路錯誤
  - 下拉選項用 `useSettings()`（每次開啟網頁讀取一次）
- 登入狀態（`src/lib/session.ts`）：帳密與目前店員存在 `localStorage`，按「登出」才清除；店員可在頁首切換，新增訂單／維修時用來帶入 `staff`、`technician`
- repo 為公開，不可放入真實客戶資料或任何密碼
