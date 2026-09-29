# 足跡地圖資料

- `world.json`：世界各國，來自 [world-atlas](https://github.com/topojson/world-atlas)（Natural Earth 1:50m，ISC 授權），Equal Earth 投影、已簡化。
- `tw.json`：台灣縣市，來自 [taiwan-atlas](https://github.com/dkaoster/taiwan-atlas)（內政部國土測繪中心資料，MIT 授權），金門、連江放在左上角的小框。
- `build.js`：產生這兩個檔案的腳本（需要先 `npm pack world-atlas@2 taiwan-atlas topojson-client@3` 並解壓到 /tmp/mapdl）。
