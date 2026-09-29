# 哇娃衣櫃（WAWA CLOSET）— 給 Claude 的工作說明

完整交接內容在 `docs/交接手冊.md`，開始工作前先讀一次。

## 跟使用者溝通
- 一律用**繁體中文**回覆，語氣親切、白話，少用術語。
- 使用者看不到程式碼，改完要用「畫面上會看到什麼」來說明。
- 使用者說「合併」（或「修改後合併」「沒問題就合併」「做完合併」）才合併；沒說就只推到分支，最後問要不要合併。

## 絕對不能做
- 不要把 API 密鑰、Apple／Google 憑證、任何密碼放進程式碼或 GitHub，也不要貼在對話裡。密鑰由使用者自己填進 Cloudflare。
- 不要提交使用者的原始照片（`tools/shots` 用的娃娃照、旅行照都不進 repo）。照片一定要去掉 EXIF／GPS。
- Cloudflare 部署、Apple／Google 開發者帳號、上架送審都要使用者自己按，不要假裝做得到。

## 產品上的堅持
- 「回血」只算賣掉的**娃衣**，娃娃離開永遠不算回血。

## 每次發版
1. `index.html` 的 `APP_VER` 和 `version.json` 一起加一版（格式 `2026.10.01-NN`）。
2. 改了字典（`i18n/*.js`）要把 `i18n/i18n.js` 的 `V` 和 `index.html` 裡 `i18n/i18n.js?v=` 一起加 1。
3. `cp index.html doll-wardrobe.html`。
4. 新增的中文字要補英文：寫進 `tools/i18n/extra_en.json`，再 `node tools/i18n/build_en.js`。
5. 用 Playwright 實際點過（語系要設 `zh-TW`，否則會自動切成英文）。

## 合併流程
在指定的分支開發 → 推上去 → 用 GitHub 工具開 PR（owner `shiun-wq`、repo `wc`、base `main`，內文用中文，最後加 PR 署名）→ `merge_method: "merge"`。
