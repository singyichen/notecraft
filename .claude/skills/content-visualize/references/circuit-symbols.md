# 電路示意圖符號參考（手寫 SVG）

給「電子學實作」一類課程筆記使用：畫麵包板電路、電路學公式推導旁的示意電路、放大器 / 濾波器分析圖時，**維持決策樹第 2 條的原則（手寫 SVG，不引入函式庫）**，用本檔的標準符號組出電路圖，而不要為了畫電路去裝 `tscircuit`、`react-circuit-schematics` 之類的套件（這些是完整 EDA / PCB 設計工具，依賴龐大，超出白名單且對單一筆記元件而言過重——已在對話中與作者確認過）。

## 來源與授權

以下符號是依 **IEEE Std 315 / IEC 60617** 通用電路符號慣例重新繪製的簡化版，形狀交叉參考自兩個 MIT 授權的開源符號庫：

- [tscircuit/schematic-symbols](https://github.com/tscircuit/schematic-symbols)（線上瀏覽：[symbols.tscircuit.com](https://symbols.tscircuit.com/)）
- [sjgallagher2/SchematicSymbolsSVG](https://github.com/sjgallagher2/SchematicSymbolsSVG)

**這裡的 path 不是那兩個 repo 檔案的逐字複製**——它們的原始 SVG 是 Inkscape 匯出檔，帶有 `rotate()` transform、`{REF}`/`{VAL}` 佔位字與大量編輯器 metadata，直接貼進 `.tsx` 既難維護也難跟 `notecraft-design` 的 token 系統接軌。因此本檔把每個符號在一個乾淨、統一的座標網格上重新繪製，方便直接組裝。若本檔沒收錄的冷門符號（例如特殊二極體、繼電器、USB-C），可到 symbols.tscircuit.com 找形狀當視覺參考，再依下面的網格慣例重畫，不要直接把該站 SVG 檔 import 進元件。

## 網格慣例

- 兩端子元件（電阻、電容、電感、二極體、保險絲、電表）：`viewBox="0 0 60 30"`，左端子固定在 `(0,15)`，右端子固定在 `(60,15)`，可安全裁切/延伸中間的接線長度。
- 三端子元件（電晶體、可變電阻）：`viewBox="0 0 40 40"`。
- 運算放大器：`viewBox="0 0 60 40"`。
- 每個符號都用 `<g transform={`translate(${x} ${y})`}>` 包起來放進主電路的座標系，需要垂直走線時整組再加 `rotate(90 30 15)`（以符號中心為軸）。
- 線條一律 `fill="none"` + `strokeLinecap="round"` + `strokeLinejoin="round"`，`strokeWidth` 用 1.5（接線／符號本體）與 1（箭頭等細節）兩級，不要每個元件各自發明新的線寬。
- 顏色不要寫死色碼：符號本體用 `stroke="var(--text-strong)"`（墨色，即 `--blue-950`）；需要標示「目前導通 / 高亮」路徑時用 `stroke="var(--blue-500)"`；標示故障 / 超出安全值用 `stroke="var(--danger-500)"`。文字（元件編號、數值、V/A 標示）用 `fontFamily: 'var(--font-mono)'`、顏色同符號本體。
- 接點（wire junction）：兩條線真的相接時畫一個 `r=2.5` 的實心圓點（`fill="var(--text-strong)"`）；只是視覺交叉但不相接則不畫點（也不要畫成小圓弧跳線，現代慣例是「有點才連，沒點就是交叉不連」，兩者都要在圖例或上下文中一致）。

## 基本元件符號

以下 JSX 片段可直接貼進 component-generator 產出的 `.tsx`（皆已用 camelCase 屬性）。`{/* leads: (0,15) → (60,15) */}` 這類註解只是給你對齊接線用，正式產出時可以拿掉或保留視情況。

### 電阻 Resistor（鋸齒版）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
</g>
```

### 電阻 Resistor（IEC 方框版，教材若用這個慣例就選這個，不要跟鋸齒版混用）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M0,15 H15 M45,15 H60" />
  <rect x={15} y={8} width={30} height={14} />
</g>
```

### 電容 Capacitor（無極性）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
  <path d="M0,15 H28 M32,15 H60" />
  <path d="M28,5 V25 M32,5 V25" />
</g>
```

### 電容 Capacitor（極性 / 電解電容——右板改成弧形，並在左板旁標 +）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
  <path d="M0,15 H28 M34,15 H60" />
  <path d="M28,5 V25" />
  <path d="M32,6 Q37,15 32,24" />
  <text x={20} y={4} fontSize={8} fontFamily="var(--font-mono)" stroke="none" fill="var(--text-strong)">+</text>
</g>
```

### 電感 Inductor（線圈）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
  <path d="M0,15 H10" />
  <path d="M10,15 a5,7 0 0 1 10,0 a5,7 0 0 1 10,0 a5,7 0 0 1 10,0 a5,7 0 0 1 10,0" />
  <path d="M50,15 H60" />
</g>
```

### 二極體 Diode

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M0,15 H20 M36,15 H60" />
  <path d="M20,7 L20,23 L36,15 Z" fill="var(--text-strong)" />
  <path d="M36,7 V23" />
</g>
```

### 發光二極體 LED（二極體 + 兩道發光箭頭）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M0,15 H20 M36,15 H60" />
  <path d="M20,7 L20,23 L36,15 Z" fill="var(--text-strong)" />
  <path d="M36,7 V23" />
  <path d="M40,2 L46,-4 M46,-4 L42,-4 M46,-4 L46,0" />
  <path d="M46,6 L52,0 M52,0 L48,0 M52,0 L52,4" />
</g>
```

### 齊納二極體 Zener Diode（陰極線兩端外折）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M0,15 H20 M40,15 H60" />
  <path d="M20,7 L20,23 L36,15 Z" fill="var(--text-strong)" />
  <path d="M40,7 L36,7 M36,7 V23 M36,23 L40,23" />
</g>
```

### 電晶體 NPN

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M0,20 H14" />
  <path d="M14,8 V32" strokeWidth={2} />
  <path d="M14,14 L30,4 V0" />
  <path d="M14,26 L30,36 V40" />
  <path d="M22,29.5 L28,33 L22.5,34.5 Z" fill="var(--text-strong)" />
</g>
```

### 電晶體 PNP（箭頭方向相反：指向基極）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M0,20 H14" />
  <path d="M14,8 V32" strokeWidth={2} />
  <path d="M14,14 L30,4 V0" />
  <path d="M14,26 L30,36 V40" />
  <path d="M21.5,25.5 L15.5,29 L21,30.5 Z" fill="var(--text-strong)" />
</g>
```

> NPN／PNP 的箭頭永遠畫在射極（emitter，下方那條斜線）上；NPN 箭頭指離基極（往外），PNP 箭頭指向基極（往內）——這是分辨兩者唯一的視覺線索，畫錯方向會誤導讀者。

### 運算放大器 Op-Amp

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M14,4 L14,36 L50,20 Z" />
  <path d="M0,12 H14 M0,28 H14 M50,20 H60" />
  <text x={17} y={15} fontSize={9} fontFamily="var(--font-mono)" stroke="none" fill="var(--text-strong)">−</text>
  <text x={17} y={32} fontSize={9} fontFamily="var(--font-mono)" stroke="none" fill="var(--text-strong)">+</text>
</g>
```

需要畫電源腳位（Vcc / Vee）時，另外從三角形頂邊/底邊中點各拉一條到 `y=0` / `y=40` 的短線並標字，不要省略成無電源版又不說明。

### 接地 Ground

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
  <path d="M15,0 V10" />
  <path d="M5,10 H25 M8,14 H22 M11,18 H19" />
</g>
```

### 電池 / 直流電源 Battery（雙電池格）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
  <path d="M0,15 H22 M37,15 H60" />
  <path d="M22,5 V25" strokeWidth={1.5} />
  <path d="M27,10 V20" strokeWidth={4} />
  <path d="M32,5 V25" strokeWidth={1.5} />
  <path d="M37,10 V20" strokeWidth={4} />
</g>
```

> 細長線＝正極、粗短線＝負極，方向不要畫反。若要標電壓（如 `V_s = 5V`），標在符號正上方置中。

### 開關 SPST Switch（常開）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
  <path d="M0,15 H15 M45,15 H60" />
  <circle cx={15} cy={15} r={2} fill="var(--text-strong)" />
  <circle cx={45} cy={15} r={2} fill="var(--text-strong)" />
  <path d="M15,15 L41,6" />
</g>
```

### 三用電表探棒 Voltmeter / Ammeter（圓圈內放 V 或 A）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
  <path d="M0,15 H18 M42,15 H60" />
  <circle cx={30} cy={15} r={12} />
  <text x={30} y={19} fontSize={12} textAnchor="middle" fontFamily="var(--font-mono)" stroke="none" fill="var(--text-strong)">V</text>
</g>
```

電流表把 `V` 換成 `A` 即可；量測方向（電壓表跨接在元件兩端、電流表串接在支路中）務必畫對，這是課程最常考的觀念錯誤點之一。

### 可變電阻 / 電位器 Potentiometer（電阻 + 滑動箭頭）

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
  <path d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
  <path d="M45,32 L25,12" />
  <path d="M45,32 L38,30 M45,32 L43,25" />
  <path d="M45,32 V40" />
</g>
```

### 保險絲 Fuse

```tsx
<g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
  <path d="M0,15 H14 M46,15 H60" />
  <ellipse cx={30} cy={15} rx={16} ry={8} />
  <path d="M14,15 H46" />
</g>
```

## 組裝範例：RC 低通濾波器

示範怎麼把上面的符號拼成一張完整電路圖（電壓源 → 電阻 → 節點 → 電容接地，節點引出當輸出）：

```tsx
export default function RcLowPassFilter() {
  return (
    <svg viewBox="0 0 320 160" width="100%" role="img" aria-label="RC 低通濾波器電路圖">
      {/* 電壓源 */}
      <g transform="translate(20 60) rotate(90 30 15)">
        <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
          <path d="M0,15 H22 M37,15 H60" />
          <path d="M22,5 V25" />
          <path d="M27,10 V20" strokeWidth={4} />
          <path d="M32,5 V25" />
          <path d="M37,10 V20" strokeWidth={4} />
        </g>
      </g>
      <text x={0} y={70} fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-strong)">Vin</text>

      {/* 接線：電源正極 → 電阻左端 */}
      <path d="M50,60 V30 H90" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />

      {/* 電阻 */}
      <g transform="translate(90 15)">
        <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0,15 H10 L15,7 L20,23 L25,7 L30,23 L35,7 L40,23 L45,7 L50,15 H60" />
        </g>
      </g>
      <text x={100} y={10} fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-strong)">R</text>

      {/* 輸出節點（含接點圓點）與輸出接腳 */}
      <circle cx={170} cy={30} r={2.5} fill="var(--text-strong)" />
      <path d="M170,30 H240" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
      <text x={244} y={34} fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-strong)">Vout</text>

      {/* 節點往下接電容 */}
      <path d="M170,30 V60" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
      <g transform="translate(140 60) rotate(90 30 15)">
        <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
          <path d="M0,15 H28 M32,15 H60" />
          <path d="M28,5 V25 M32,5 V25" />
        </g>
      </g>
      <text x={182} y={70} fontSize={11} fontFamily="var(--font-mono)" fill="var(--text-strong)">C</text>

      {/* 電容 → 接地，並與電源負極接地線相連（共同接地） */}
      <path d="M170,90 V120 M50,90 V120 H170" stroke="var(--text-strong)" strokeWidth={1.5} fill="none" />
      <g transform="translate(155 120)">
        <g stroke="var(--text-strong)" strokeWidth={1.5} fill="none" strokeLinecap="round">
          <path d="M15,0 V10" />
          <path d="M5,10 H25 M8,14 H22 M11,18 H19" />
        </g>
      </g>
    </svg>
  )
}
```

若這張圖是要「讓讀者體驗」截止頻率如何隨 R、C 改變（決策樹第 1 條的互動優先原則），可以把 `R`、`C` 換成 `useState` 控制的 slider 數值，再用 `motion` 讓輸出波形（另外疊一個 `recharts`/手繪 SVG 的頻率響應曲線）跟著即時重繪；電路圖本身通常維持靜態，互動放在旁邊的圖表上，這樣電路圖才不會因為頻繁重排版而閃爍。

## 常見錯誤

- 電阻鋸齒版跟方框版**同一篇筆記裡混用**——挑一種、整篇一致。
- NPN/PNP 箭頭方向畫反、或忘記畫箭頭（沒有箭頭無法分辨電晶體極性與型式）。
- 電流表畫成跨接（應該是串接在支路中），電壓表畫成串接（應該是跨接在元件兩端）。
- 把「交叉但不相連」的兩條線畫上接點圓點，或反過來漏畫真正相連處的圓點——同一張圖要保持規則一致。
- 用色上把符號本體塗成 `--blue-500`（品牌色）而非墨色 `--text-strong`，導致電路圖看起來像資訊圖表而不是電路圖；品牌色只保留給「目前導通路徑」這種語意標示。
