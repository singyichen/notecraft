# Motion 元件常見陷阱

給「三顆切換鈕 + `AnimatePresence` 淡入內容」這類元件（例如三態對照、tab 走查）使用。這份檔案只收錄**實際踩過、會讓元件在真實瀏覽器裡壞掉**的陷阱，不是 Framer Motion 的完整教學。

## `AnimatePresence` 沒加 `initial={false}` 會讓內容永久卡在 opacity:0

### 症狀

元件在 SSR/靜態輸出的 HTML 裡文字內容都在（`grep`/`View Source` 看得到），但瀏覽器打開後那塊內容區**完全看不見、永遠是空白**，不會自己恢復——直到使用者剛好點了某個東西（觸發一次 re-render）才會突然淡入。這正是本專案第一次生成 `ec-week1-doping` / `ec-week1-pn-junction` 兩個「三態切換 + 卡片淡入」元件時實際發生的 bug：用 headless Chromium 量測發現內容區 `getComputedStyle(el).opacity` 卡在 `"0"` 長達數秒都不會變成 `"1"`。

### 成因

常見寫法是這樣：

```tsx
// 有問題的寫法
<AnimatePresence mode="wait">
  <motion.div
    key={activeState}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
  >
    {/* 內容 */}
  </motion.div>
</AnimatePresence>
```

`AnimatePresence` 預設 `initial={true}`：代表**它掛載時就存在的第一個 child，也要播放一次「從 initial 到 animate」的進場動畫**。這個進場動畫靠 `requestAnimationFrame` 驅動。問題是 Astro 的 `client:visible` 元件是先由伺服器端把 React 樹渲染成靜態 HTML（此時 Framer Motion 會把 `initial` 的樣式直接烤進 HTML，也就是一開始就是 `opacity:0`），再等瀏覽器把對應 JS chunk載入、hydrate 之後才會真的觸發「進場動畫」把它變回 `opacity:1`。如果那個 tab/webview 在首次繪製時**沒有取得焦點**（背景分頁、embedded webview、螢幕截圖工具等），Chromium 會把該頁面的 rAF 節流到接近停止，動畫就會卡在半路（甚至卡在 `opacity:0` 的起點）**不會自己恢復**，直到某個使用者互動（例如點擊）讓分頁重新取得焦點、rAF 才被解除節流。

### 修法

只要在最外層 `AnimatePresence` 加一個 `initial={false}`：

```tsx
// 正確寫法
<AnimatePresence mode="wait" initial={false}>
  <motion.div key={activeState} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
    {/* 內容 */}
  </motion.div>
</AnimatePresence>
```

`initial={false}` 告訴 Framer Motion：「掛載當下已經存在的 child，直接視為已經處於 `animate` 狀態，不要播放進場動畫」。這會改變 SSR 輸出本身——伺服器端渲染出來的 HTML 就直接是 `opacity:1`，**完全不依賴 client 端的 rAF/hydration 就能正確顯示**，符合「client:visible 元件在 JS 尚未跑起來之前也該先以正確樣子呈現」的漸進增強原則。之後使用者切換分頁（`key` 改變）觸發的 exit/enter 轉場**不受影響**，因為那是掛載後才發生的真正 presence 變化，`initial={false}` 只影響「元件第一次掛載時已經在那裡的內容」。

### 規則

**任何用 `AnimatePresence` 包住「頁面/元件一載入就該立刻可見的內容」時，一律加 `initial={false}`。** 只有當你確實希望使用者一打開頁面就看到一段「從無到有」的進場動畫、且能接受它在背景分頁/未取得焦點時可能延遲播放，才維持預設的 `initial={true}`——這種情況在筆記內嵌的視覺化元件裡幾乎不存在（讀者是捲動到這個區塊才看到它，不是它自己彈出來吸引注意力），所以預設就該加 `initial={false}`。

反過來，`motion.div` 本身如果**沒有被 `AnimatePresence` 包住、也沒有 `key` 會變動**（例如本專案 PN 接面元件裡那條長條本身，用 `animate={{width: ...}}` 但沒寫 `initial`），不受這個陷阱影響：沒有明確 `initial` 時 Framer Motion 直接以 `animate` 的值當起始值渲染，SSR 輸出就已經是正確最終狀態，不需要額外加什麼。
