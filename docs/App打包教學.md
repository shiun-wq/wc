# 哇娃衣櫃 App：裝到自己手機試用

這份是「先裝到自己手機試試看」的步驟，還不是上架。上架步驟之後另外寫。

> ⚠️ 簽章檔、金鑰（`.jks`、`.keystore`、`.p12`、`.p8`…）**不要**傳給任何人、不要放上 GitHub。

## 先準備（兩種手機都要）
1. 安裝 [Node.js](https://nodejs.org)（選 LTS 版）。
2. 把這個專案下載到電腦：GitHub 頁面 → 綠色 **Code** → **Download ZIP**，解壓縮。
3. 打開「終端機」（Mac）或「命令提示字元」（Windows），進到專案資料夾，輸入：
   ```
   npm install
   npm run sync
   ```
   `npm run sync` 會把網頁放進 App。**以後網頁有更新，都要再跑一次 `npm run sync`。**

## Android 手機（Windows 或 Mac 都可以）
1. 安裝 [Android Studio](https://developer.android.com/studio)。
2. 手機：設定 → 關於手機 → 連點「版本號碼」7 下打開開發人員選項 → 打開「USB 偵錯」。
3. 手機用傳輸線接電腦。
4. 在專案資料夾輸入 `npm run open:android`，會打開 Android Studio。
5. 第一次打開會下載一些東西，等它跑完，上面選你的手機，按綠色 ▶。

## iPhone（一定要 Mac）
1. 從 App Store 安裝 **Xcode**。
2. 在專案資料夾輸入 `npm run open:ios`，會打開 Xcode。
3. 左邊點 **App** → 中間 **Signing & Capabilities** → Team 選你的 Apple ID（沒有就按 Add Account 登入）。
   - 用免費的 Apple ID 就能裝到自己手機，但 7 天後要重裝一次。付費開發者帳號（US$99／年）才能上架。
   - 如果說 Bundle Identifier 被用過，先把它改成別的（例如後面加上你的名字），只是自己測試沒關係。
4. iPhone 接上 Mac，上面選你的 iPhone，按 ▶。
5. 第一次 iPhone 會說「未受信任的開發者」：設定 → 一般 → VPN 與裝置管理 → 信任。

## 目前 App 裡還不能用的
- **提醒通知**：App 裡要換一種通知方式，還沒做。
- **AI 功能**：要先到 Cloudflare 的 `ALLOWED_ORIGINS` 加上
  `capacitor://localhost,https://localhost`（見 `docs/後台部署教學.md` 第 4 步）。
- **付款、會員**：還是測試模式。
