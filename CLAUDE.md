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
- 前端依賴新後端 action 時，merge 後要立刻執行 `yarn deploy`；GitHub Actions 部署前端約需 1～2 分鐘，在此之前完成即可。

## 目前進度

- [x] Google Sheets schema 已建立
- [x] 前端已能連線到 Apps Script 網頁應用程式
- [x] `api/` 已用 clasp clone 下線上腳本
- [x] 確認 `yarn deploy` 流程可更新既有部署且網址不變
- [x] 後端共用骨架（`doPost` 路由、`checkAuth`、日期格式化、`withLock`、統一回應格式）
- [x] 登入頁（帳密＋選擇店員）、共用版面、路由保護；其餘頁面為「建置中」
- [x] 客人：API（列表搜尋、查詢、新增、編輯）、新增頁、資料頁（基本資料檢視與編輯）、首頁暫放客人搜尋
- [x] 客人搜尋改為前端即時搜尋；查詢快取 1 分鐘、存檔後直接更新快取；頁首重新整理按鈕
- [x] 維修（一）：機器與維修 API、新增維修單、維修單詳情（編輯、變更狀態、歷程、編輯機器）、客人頁「新增維修」按鈕
- [x] 維修（二）：首頁「維修｜客人」分頁與維修篩選、客人頁「歷史維修」「送修過的機器」
- [x] 訂單（一）：訂單 API、新增訂單（散客、品項、折扣快速鈕、商品名稱提示）、訂單詳情（補綁客人、付款資訊、取消、退貨）、客人頁「新增訂單」按鈕
- [x] 訂單（二）：發票（訂單與維修單共用；新增訂單時開立、拆分、補號碼、作廢、折讓；取消／退貨連動；維修單發票）
- [ ] 訂單（三）：首頁「訂單」分頁、客人頁「歷史訂單」
- [ ] 首頁搜尋：加入「訂單」分頁（維修、客人分頁已完成）

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
    ├── utils.js       ← readSheet、jsonResponse、formatDate、withLock、AppError、appendRecord、appendRecords、updateRecord、updateRecords、deleteRecords、nextId、todayString、PAGE_SIZE、toAmount、toBool、parseAmount、parseDate、toText
    ├── settings.js    ← getSettings
    ├── customers.js   ← allCustomers、getCustomer、createCustomer、updateCustomer
    ├── devices.js     ← allDevices、updateDevice、findOrCreateDevice、normalizeSerial
    ├── repairs.js     ← allRepairs、getRepair、createRepair、updateRepair、changeRepairStatus
    ├── orders.js      ← allOrders、getOrder、productSuggestions、createOrder、updateOrder、cancelOrder、returnOrder
    └── invoices.js    ← issueOrderInvoice、moveInvoiceItems、issueRepairInvoice、updateInvoice、deleteInvoice、voidInvoice、統編與號碼檢核
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
- **讀寫試算表要批次處理**：用 `getDataRange().getValues()` 一次讀整張表；寫入一律用 `appendRecord()`／`updateRecord()`（依標題寫整列，字串設純文字、`Date` 設日期時間、數字與布林維持原型別，避免電話開頭的 0 被吃掉）；不要在迴圈中逐格讀寫。
- **`ACTIONS` 登記時用箭頭函式**（`p => createCustomer(p)`）：各檔案依序載入，`main.js` 執行時其他檔案的函式可能尚未定義。
- 寫入函式在 `withLock()` 內完成「讀取 → 檢查 → 產生主鍵（`nextId`）→ 寫入」，只接受白名單欄位。
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
- **Repairs**：repair_id, customer_id, device_id, received_at, accessories, intake_condition, issue, diagnosis, status, quote_amount, final_amount, deposit, is_paid, estimated_done_date, completed_at, picked_up_at, handler, note, created_at, updated_at
- **RepairLogs**：log_id, repair_id, status, note, staff, created_at
- **Settings**：下拉選項清單（category, platform, condition, payment_method, order_status, repair_status, source_type, invoice_status, device_type, brand, staff, accessory, discount_rate）；每欄一種選項，第 1 列為欄名，往下每列一個值，各欄長度可不同

## 資料慣例

- 選項值存中文（例：維修狀態「維修中」）
- 金額為新台幣整數
- 日期時間格式 `yyyy-mm-dd hh:mm`，時區 Asia/Taipei；回傳前端前先格式化，避免變成 UTC
  - `jsonResponse()` 會把回應中所有 `Date` 經 `formatDate()` 轉成字串，所有 API 回應都必須經過它
  - 試算表中只有日期的儲存格也會讀成 `Date`，會輸出為 `yyyy-mm-dd 00:00`
  - 前端送來的日期一律為 `yyyy-mm-dd`，寫入前以 `parseDate()` 轉成台北時間當天 00:00 的 `Date`；前端以 `dateOnly()` 取前 10 碼顯示或填入 `<input type="date">`
- 主鍵由後端產生：前綴-日期-流水號，例 `O-20261018-001`、`R-…`、`C-…`、`D-…`、`INV-…`
- `_id`、電話、序號、發票號碼、統編皆為純文字

## 業務規則（後端負責）

- `line_total = unit_price × qty`；`subtotal` 為明細加總；`total = subtotal − discount`
- 一筆訂單可有多張發票；每個品項只屬於一張發票（`OrderItems.invoice_id`）；同一品項不可拆到兩張發票
- 發票（訂單與維修單共用，`source_type` 銷售／維修，`source_id` 為單號）：
  - 狀態：「已開立」（`invoice_no` 空白時稱「待補號碼」，代表還沒印出）、「作廢」、「折讓」；有效發票 = 已開立 + 折讓。狀態值寫在 `invoices.js` 與前端 `lib/invoices.ts` 的常數
  - `invoice_no` 選填；有填時轉大寫、去空白與連字號，需為 2 個英文字母 + 8 位數字，且不可與其他有效發票重複（作廢的不算）
  - `buyer_tax_id` 選填；有填時需為 8 位數字並通過財政部檢查碼（可被 5 整除；第 7 碼為 7 時總和 +1 亦可）
  - `invoice_date` 必填、不可晚於今天；主鍵 `INV-<發票日期>-NNN`，之後改日期主鍵不變
  - 待補號碼的發票可調整品項、可刪除（直接刪除該列）；已填號碼後品項鎖定，只能作廢
  - 「已開立」可修改號碼、日期、統編、備註（更正登打錯誤）；作廢或折讓只能改備註
  - 作廢：只能作廢已填號碼的發票，原因必填、不可還原；原因與當時的品項名稱寫入 `note`，金額保留
- 銷售發票：
  - 一筆訂單可有多張發票；每個品項只屬於一張有效發票（`OrderItems.invoice_id`），未開發票的品項 `invoice_id` 空白
  - 金額 = 折扣後的實收金額：所屬品項 `line_total` 加總 − 依比例分攤的折扣（四捨五入）；所有品項都開立後，最後一張可調整的發票（待補號碼或本次新增）以「總計 − 其他有效發票」補平差額。只有待補號碼的發票金額會重算，已填號碼的固定（`saveOrderInvoiceContext`）
  - 新增訂單時預設把全部品項開成一張（日期 = 訂單日期，可取消勾選）；之後在詳情頁開立（日期預設今天）、移動品項拆分
  - 只有訂單「已完成」時能開立、移動、單獨作廢；單獨作廢會釋出品項（`invoice_id` 清空）以便重開
  - 取消訂單：待補號碼的發票刪除、已填號碼的自動作廢；退貨：待補號碼的刪除、已填號碼的逐張選作廢或折讓（預設作廢）；品項不釋出
- 維修發票：一張維修單只有一張有效發票，金額 = `final_amount`（未填不可開立、已取消不可開立）
  - 總金額變動：待補號碼的發票金額跟著更新；已填號碼的需先作廢才能修改總金額（也不可清空）
  - 改為「已取消」：有已填號碼的有效發票時擋下，需先作廢；待補號碼的自動刪除
- 訂單：
  - 只做現場銷售，建立即「已完成」；一筆訂單一種付款方式（混合付款寫備註）
  - 散客的 `customer_id` 固定為 `WALK-IN`（Customers 分頁沒有這一列；後端收到空白也轉為 `WALK-IN`，讀取時空白視為 `WALK-IN`；前端用 `isWalkIn()` 判斷）；「已完成」時可補綁、更換、移除客人
  - 建立後品項與金額不可修改（打錯就取消重建）；「已完成」可改客人、`payment_method`、`staff`、`note`，取消／退貨後只能改 `note`
  - `order_date` 預設今天、可補登過去但不可晚於今天，建立後不可改；單號與明細主鍵取**訂單日期**（`nextId(prefix, ids, date)`），`created_at` 為實際建立時間
  - 品項必填名稱、類別、單價（可 0，贈品）、數量（≥ 1）；平台可留空，商品狀態預設「全新」；至少一個品項
  - 折扣存金額（0 ～ 小計）；前端快速鈕來自 Settings `discount_rate`（例 95 = 95 折，四捨五入），套用比例後隨小計重算、手動改金額後固定；舊品折抵記在折扣並寫備註
  - 取消（更正建錯）與退貨（客人整筆退回）都只能從「已完成」轉換、原因必填、不可還原、無時間限制，共用 `returned_at`、`return_reason`，以 `status` 區分
  - 狀態值寫在 `orders.js` 與前端 `lib/orders.ts` 的常數，Settings `order_status` 改名時需同步
- `serial_no` 正規化（大寫、去空白與連字號），有填則唯一
- 客人：`name` 必填，`phone`／`line_id` 至少一項；`phone` 只存數字（8～10 碼），有填則唯一（重複回傳 `DUPLICATE_PHONE` 與既有客人）；前端顯示時手機格式化為 `0912-345-678`；不提供刪除
- Devices 不記錄客戶；「客人送修過哪些機器」由 Repairs 的 `customer_id` + `device_id` 查出
- 建立維修單時，先列出該客人過去送修過的機器供選擇，避免重複建立
- 每次變更 `Repairs.status` 同時新增一筆 RepairLogs
- 維修單：
  - 新增時狀態固定「已收件」，並寫入第一筆 RepairLogs（`staff` = 收件店員）；`received_at` 由後端填入
  - 必填：客人、機器、`issue`；`handler`（經手人員）可留空，日後指派
  - 狀態只能經 `changeRepairStatus` 變更（任意狀態皆可，需在 Settings `repair_status` 內）；其餘欄位以 `updateRepair` 編輯，不寫 RepairLogs；客人、機器、`received_at`、單號不可改
  - 狀態自動處理時間（依名稱判斷，Settings 改名時需同步修改 `repairs.js` 與前端 `lib/repairs.ts`）：「可取件」「無法維修」→ 填 `completed_at`（已有則保留）；「已取件」→ 填 `picked_up_at`；改回處理中（已收件、檢測中、待報價、待零件、維修中）→ 清除 `completed_at`
  - 金額：`quote_amount` 報價（可留空）、`deposit` 訂金（預設 0）、`final_amount` 總金額（非尾款）、`is_paid` 是否付清；尾款 = 總金額（未填則用報價）− 訂金，只在前端計算
  - 改為「已取件」且未付清時，前端提供「已收款並取件」（`mark_paid`）與「仍要取件」
  - 逾期：`estimated_done_date` 早於今天且狀態為處理中或待報價／待零件
- 機器：新增維修單時輸入的序號若已存在則沿用該機器（例：二手機換主人），前端只顯示機器資料與維修次數，不顯示前一位客人；編輯機器影響其所有維修單，序號重複回傳 `DUPLICATE_SERIAL`
- 寫入時使用 `LockService` 避免同時寫入衝突

## API 慣例

- 回應格式一律為 `{ ok: true, data }` 或 `{ ok: false, error, code?, data? }`（Apps Script 無法設定 HTTP 狀態碼）
  - 業務錯誤丟 `new AppError(message, code, data)`，前端以 `code` 判斷（`AUTH`、`VALIDATION`、`NOT_FOUND`、`DUPLICATE_PHONE`、`DUPLICATE_SERIAL`）；需在欄位旁顯示的 code 列在前端 `queryClient.ts` 的 `INLINE_ERROR_CODES`，不另跳通知
  - 列表 API 回傳 `{ items, total, page, pageSize }`，每頁 `PAGE_SIZE`（10）筆（客人例外：`allCustomers` 回傳全部，由前端搜尋分頁）
- 讀寫一律 `POST`（避免密碼出現在網址），body 為 JSON 字串 `{ action, auth: { user, key }, params }`，`Content-Type` 必須是 `text/plain`，以避開 CORS preflight
  - 唯一的 GET 是不需驗證的 `?action=ping`，用來確認後端是否正常
  - 新增 API：寫好處理函式（接收 `params`），在 `main.js` 的 `ACTIONS` 登記
- 驗證：`doPost` → `handleRequest` 先呼叫 `checkAuth()`，與 Script Properties 的 `API_USER`、`API_KEY` 比對；失敗時延遲 1 秒並回傳 `{ ok: false, error: '帳號或密碼錯誤', code: 'AUTH' }`。日後可換成 Google 登入
- 訂單 action：`allOrders`、`getOrder`（`{ id }` → `{ order, items, invoices }`）、`productSuggestions`、`createOrder`（`{ customer_id, order_date, items[], discount, payment_method, staff, note, invoice: { invoice_no, buyer_tax_id } | null }`）、`updateOrder`（`{ id, customer_id, payment_method, staff, note }`）、`cancelOrder`（`{ id, reason }`）、`returnOrder`（`{ id, reason, invoice_actions: { [invoice_id]: '作廢' | '折讓' } }`）；取消／退貨回傳 `{ order, items, invoices }`
- 發票 action（皆回傳所屬單據的詳情，訂單為 `{ order, items, invoices }`、維修單為 `getRepair` 的結果）：`issueOrderInvoice`（`{ order_id, item_ids[], invoice_no, buyer_tax_id, invoice_date }`）、`moveInvoiceItems`（`{ order_id, item_ids[], to_invoice_id }`，空字串 = 移出成未開發票）、`issueRepairInvoice`（`{ repair_id, invoice_no, buyer_tax_id, invoice_date }`）、`updateInvoice`（`{ id, invoice_no, buyer_tax_id, invoice_date, note }`）、`deleteInvoice`（`{ id }`）、`voidInvoice`（`{ id, reason }`）
- 已有的 action：`login`（只驗證帳密）、`settings`（回傳 `{ staff: [...], category: [...], ... }`）、`allCustomers`（全部客人，依試算表列順序）、`getCustomer`（`{ id }`）、`createCustomer`、`updateCustomer`（`{ id, name, phone, line_id, note }`）、`allDevices`、`updateDevice`（`{ id, serial_no, device_type, brand, device_model, note }`）、`allRepairs`、`getRepair`（`{ id }` → `{ repair, device, logs, invoices }`）、`createRepair`（`{ customer_id, device_id | device, issue, …, staff }`）、`updateRepair`、`changeRepairStatus`（`{ id, status, note, staff, mark_paid? }`）

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
  - 查詢預設 `staleTime` 1 分鐘：1 分鐘內不重新讀取；過期後切回分頁或重新進入頁面時在背景更新（`settings` 為 `Infinity`）
  - 頁首「重新整理」按鈕呼叫 `invalidateQueries()`，重新讀取目前畫面的資料（含 `settings`）
  - 新增／編輯成功後以回傳資料 `setQueryData` 更新快取，不重新讀取
- 客人搜尋：`useAllCustomers()` 讀取全部客人，`searchCustomers()` 在前端比對（姓名、LINE ID、電話數字）、排序（新到舊）與分頁；首頁邊打字邊搜尋，關鍵字以 `replace` 同步到網址 `?q=`。客人詳情以全部客人快取為 `initialData`，快取沒有時才呼叫 `getCustomer`
- 首頁（`HomePage`）：依類型分頁，`?tab=`（預設維修、`customers` 客人），切換分頁時清除其他條件；各分頁元件（`RepairSearch`、`CustomerSearch`）自行讀寫網址參數
  - 維修搜尋（`src/lib/repairSearch.ts`）：前端合併 `allRepairs`、`allCustomers`、`allDevices`；關鍵字比對單號、客人姓名、電話、序號、機型、問題描述；條件（`?status=`（逗號分隔）、`from`、`to`、`handler`（`__none__` = 未指派）、`paid`、`overdue=1`）收在「篩選」面板，有條件時預設展開；收件時間新到舊
  - 分頁一律用 `src/lib/paging.ts` 的 `paginate()`（每頁 10 筆）與 `<Pagination />`
- 發票（`src/lib/invoices.ts`）：訂單詳情的 `OrderInvoicesCard`、維修單詳情的 `RepairInvoiceCard`，共用 `InvoiceBlock`（狀態標籤與操作選單）與 `InvoiceDialogs`（開立、編輯、作廢、刪除）；號碼與統編檢核、金額預估與後端相同規則。發票操作回傳詳情後以 `setOrderDetailCache`／`setRepairDetailCache` 更新快取
  - 從 `DropdownMenu` 開啟 Dialog 時用 `modal={false}`，避免 body 的 pointer-events 被鎖住
- 客人頁：歷史維修（新到舊）與送修過的機器，由 `useCustomerHistory()`（`src/lib/customerHistory.ts`）從 Repairs 推出；新增維修單的機器選擇也用它
- 表單檢核時機：用 `src/lib/useFieldErrors.ts`，欄位 onBlur 後才顯示該欄錯誤、送出時顯示當下有錯的欄位（送出後才新增的欄位，例如新品項，仍等 onBlur）；錯誤每次 render 由目前的值重新計算。下拉選單（`SettingSelect`）以選單關閉視為離開欄位（觸發器的 onBlur 在展開時就會觸發）
- 不要用 `crypto.randomUUID()`：手機以區網 IP（http）連 dev server 時不是安全環境，會直接出錯；前端暫時 id 用遞增編號
- 彈出視窗（Dialog）中的表單：React 事件會沿**元件樹**冒泡（不是 DOM 樹），Portal 內的 `submit` 會觸發外層 `<form>` 的 onSubmit。視窗不要放在其他表單內；可重用的表單元件在 onSubmit 中 `e.stopPropagation()`
- 同一路由只改網址參數時元件不會重新掛載（例：`/repairs/new?customer=`），依參數重設的狀態以 `key` 處理
- 詳情頁的「返回」：連到詳情頁時在 router `state` 帶 `BackState`（`{ from: 來源網址, label: '回搜尋結果' }`，見 `src/lib/navigation.ts`），詳情頁用 `<BackButton fallback fallbackLabel />`；不用 `navigate(-1)`（直接開網址時會離開網站）
  - 從詳情頁再連到其他詳情頁時用 `backStateFrom(location, '回維修單')`：會把目前頁面自己的 BackState 放進 `state`，返回時帶回，多層返回仍正確（搜尋 → 客人 → 維修單 → 回客人資料 → 回搜尋結果）
- 登入狀態（`src/lib/session.ts`）：帳密與目前店員存在 `localStorage`，按「登出」才清除；店員可在頁首切換，新增訂單／維修時用來帶入 `staff`（RepairLogs）；維修單的 `handler`（經手人員）另行選擇
- repo 為公開，不可放入真實客戶資料或任何密碼
