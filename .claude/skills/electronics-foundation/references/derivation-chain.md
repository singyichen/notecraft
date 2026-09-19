# 推導鏈：從 Boltzmann 因子到二極體方程式

第 2 章的十幾條公式是一條線。親手推過一次之後，每條公式都變成「第幾步的結果」，忘了也能重建。以下每一步只用 [primitives.md](primitives.md) 的八個原始概念和高中以上的微積分。符號：$q > 0$ 為電子電荷大小，$V_T = kT/q$。

## 0. 起點：矽晶格與熱能

矽有 4 個價電子，每個原子與 4 個鄰居共用電子形成共價鍵。把一顆電子從鍵中拉出來需要能量 $E_g = 1.12\ \text{eV}$。溫度 $T$ 下每顆電子平均帶 $kT \approx 0.026\ \text{eV}$，遠小於 $E_g$，但 Boltzmann 因子說「擁有至少 $E$ 能量的比例是 $e^{-E/kT}$」，所以仍有極少數電子被打出來。

## 1. 本質載子濃度 $n_i$

每打出一顆自由電子就留下一個電洞，兩者成對產生，平衡時 $n = p = n_i$。

$$
n_i = 5.2\times10^{15}\, T^{3/2} \exp\!\left(-\frac{E_g}{2kT}\right)\ \text{cm}^{-3}
$$

- $T^{3/2}$：可供填入的狀態數（來自量子統計，本課不推，當已知前因子）。
- $\exp(-E_g/2kT)$：Boltzmann 尾機率。指數裡是 $E_g/2$ 而非 $E_g$，因為 $n_i^2 = np \propto e^{-E_g/kT}$，開根號後各得一半。
- 矽在 300 K：$n_i \approx 1.08\times10^{10}\ \text{cm}^{-3}$。矽原子密度約 $5\times10^{22}$，所以每五兆個原子才有一顆自由電子。

**自測**：溫度從 300 K 升到 360 K，$n_i$ 變大還是變小？大約幾倍？（提示：指數項主導，$E_g/2k \approx 6500\ \text{K}$。）

## 2. 摻雜與質量作用定律

加入五價原子（磷）每顆貢獻一個自由電子，濃度 $N_D$；加入三價原子（硼）每顆貢獻一個電洞，濃度 $N_A$。熱平衡下乘積不變：

$$
np = n_i^2
$$

N 型且 $N_D \gg n_i$ 時：

$$
n \approx N_D, \qquad p \approx \frac{n_i^2}{N_D}
$$

例：$N_D = 10^{16}$，則 $p \approx (1.08\times10^{10})^2 / 10^{16} \approx 1.2\times10^{4}$。多數載子與少數載子相差十二個數量級，這就是「摻雜百萬分之一就能決定導電性」的原因。

## 3. 漂移：受力達到終端速度

電子受電場力 $F = -qE$，但不斷撞晶格，平均每 $\tau$ 秒撞一次、速度歸零。兩次碰撞間的平均速度正比於 $E$：

$$
v_n = -\mu_n E, \qquad \mu_n = \frac{q\tau}{m_n^*}
$$

（$\mu$ 就是「摩擦係數的倒數」；矽的 $\mu_n = 1350$、$\mu_p = 480\ \text{cm}^2/(\text{V}\cdot\text{s})$。）電流密度 = 電荷 × 濃度 × 速度：

$$
\begin{aligned}
J_n &= (-q)\, n\, v_n = q\,\mu_n\, n\, E \\
J_p &= q\, p\, \mu_p E \\
J_{\text{drift}} &= q\,(\mu_n n + \mu_p p)\, E \equiv \sigma E
\end{aligned}
$$

最後一式就是歐姆定律的局部形式，$\sigma$ 是電導率。對長 $L$、截面 $A$ 的均勻材料積分：$V = EL$、$I = JA$，得 $V = I \cdot \dfrac{L}{\sigma A} = IR$。

## 4. 擴散：Fick 定律

粒子隨機走動，沒有外力。某截面左邊粒子多、右邊少，左右跨越機率相同，所以淨流量正比於濃度差，也就是斜率：

$$
\text{粒子通量} = -D\,\frac{dn}{dx}
$$

負號：往濃度低的方向流。電子帶 $-q$，電流 = $(-q) \times$ 通量：

$$
J_n = q\,D_n\,\frac{dn}{dx}, \qquad J_p = -q\,D_p\,\frac{dp}{dx}
$$

兩式差一個負號純粹因為電荷正負。矽：$D_n = 34$、$D_p = 12\ \text{cm}^2/\text{s}$。

**自測**：濃度 $n(x)$ 若是常數但很大，擴散電流是多少？（答：零。電流看斜率不看高度。）

## 5. Einstein 關係式：$D / \mu = kT / q$

漂移和擴散看似無關，但可以用「熱平衡」把它們綁在一起。考慮一塊 N 型矽，內部有某個電位分佈 $V(x)$，沒有外接電流。

**(a) Boltzmann 因子給出濃度分佈。** 電子在位置 $x$ 的位能是 $-qV(x)$，平衡時濃度正比於 Boltzmann 因子：

$$
n(x) = n_0 \exp\!\left(\frac{qV(x)}{kT}\right) = n_0 \exp\!\left(\frac{V(x)}{V_T}\right)
$$

微分：

$$
\frac{dn}{dx} = \frac{n}{V_T}\,\frac{dV}{dx}
$$

**(b) 平衡 = 淨電流為零。** 漂移電流加擴散電流等於零，並代入 $E = -dV/dx$：

$$
\begin{aligned}
0 &= J_n = q\,\mu_n\, n\, E + q\,D_n\,\frac{dn}{dx} \\
  &= q\,\mu_n\, n\left(-\frac{dV}{dx}\right) + q\,D_n\,\frac{n}{V_T}\,\frac{dV}{dx} \\
  &= q\,n\,\frac{dV}{dx}\left(-\mu_n + \frac{D_n}{V_T}\right)
\end{aligned}
$$

括號必須為零：

$$
\frac{D_n}{\mu_n} = V_T = \frac{kT}{q}
$$

對電洞同理。兩種機制之所以連在一起，是因為推導只用了一件事：同一群粒子在同一個溫度下服從同一個 Boltzmann 分佈。這在物理上叫漲落耗散定理，在數學上是布朗運動的 Einstein 1905 年結果。

## 6. PN 接面平衡態與內建電位 $V_0$

P 型與 N 型並排。接面處電子從 N 擴散到 P、電洞反向，留下不能動的離子（N 側帶正、P 側帶負），形成空乏區與內建電場。電場的漂移把載子推回去，平衡時漂移與擴散抵消，正是第 5 步的方程式。把第 5 步 (a) 從 P 側積分到 N 側：

$$
\begin{aligned}
\int_{n_p}^{n_n} \frac{dn}{n} &= \frac{1}{V_T}\int_{V_p}^{V_n} dV \\
\ln\frac{n_n}{n_p} &= \frac{V_n - V_p}{V_T} \equiv \frac{V_0}{V_T}
\end{aligned}
$$

代入 $n_n \approx N_D$、$n_p \approx n_i^2 / N_A$：

$$
V_0 = V_T \ln\frac{N_A N_D}{n_i^2}
$$

典型值：$N_A = N_D = 10^{16}$ 時 $V_0 \approx 0.026 \times \ln(10^{32}/1.17\times10^{20}) \approx 0.026 \times 27.5 \approx 0.72\ \text{V}$。這就是「二極體導通電壓約 0.7 V」的來源之一。

**自測**：摻雜濃度各提高十倍，$V_0$ 增加多少？（答：$V_T \ln 100 \approx 0.12\ \text{V}$，對數增長，所以 $V_0$ 對摻雜不敏感。）

## 7. 空乏區寬度與接面電容

空乏區內只有固定離子電荷，密度 $\rho = \pm qN$。Poisson 方程 $\dfrac{d^2V}{dx^2} = -\dfrac{\rho}{\varepsilon_{si}}$ 積分一次得電場線性、再積分得電位二次，令總電位差為 $V_0 + V_R$（逆偏 $V_R$ 加高障壁），解出寬度：

$$
W = \sqrt{\frac{2\varepsilon_{si}}{q}\left(\frac{1}{N_A} + \frac{1}{N_D}\right)(V_0 + V_R)}
$$

空乏區像一個平行板電容 $C = \varepsilon_{si} A / W$，所以：

$$
C_j = \frac{C_{j0}}{\sqrt{1 - V_R / V_0}}, \qquad
C_{j0} = \sqrt{\frac{\varepsilon_{si}\, q}{2}\cdot\frac{N_A N_D}{N_A + N_D}\cdot\frac{1}{V_0}}
$$

（上式 $W$ 中 $V_R > 0$ 為逆偏；Razavi 的 $C_j$ 公式改取逆偏為負值，所以寫成 $1 - V_R/V_0$。兩者同一件事：逆偏越深、空乏區越寬、電容越小。$C_{j0}$ 為單位面積值。）

## 8. 順偏與二極體方程式

外加順向電壓 $V_D$ 把障壁從 $V_0$ 降為 $V_0 - V_D$。第 6 步的 Boltzmann 關係改寫為 P 側邊界的電子濃度：

$$
n_p(V_D) = n_n \exp\!\left(-\frac{V_0 - V_D}{V_T}\right) = n_{p,0}\, \exp\!\left(\frac{V_D}{V_T}\right)
$$

少數載子濃度乘上 $e^{V_D/V_T}$ 倍，超出平衡值的部分靠擴散流走（第 4 步），電流正比於這個超出量：

$$
I_D = I_S\left(\exp\frac{V_D}{V_T} - 1\right), \qquad
I_S = A\,q\,n_i^2\left(\frac{D_n}{N_A L_n} + \frac{D_p}{N_D L_p}\right)
$$

- $-1$ 項來自逆偏：$V_D \to -\infty$ 時 $I_D \to -I_S$，這就是逆向飽和電流。
- $I_S$ 正比於 $n_i^2$，所以對溫度極敏感：由第 1 步公式可算出 $\dfrac{d\ln n_i^2}{dT} \approx 0.15\ \text{K}^{-1}$，理論上約每升 5 °C 翻倍。

**60 mV 法則**：電流增為 10 倍需要

$$
\Delta V_D = V_T \ln 10 \approx 0.026 \times 2.303 \approx 60\ \text{mV}
$$

這解釋了為什麼可以用「$V_D \approx 0.7\ \text{V}$ 定電壓模型」：指數太陡，電流從 1 mA 變到 100 mA 電壓只動 120 mV。

## 9. 逆向崩潰

逆偏電場太強時兩種機制讓電流暴增：

| 機制 | 原始概念 | 何時主導 |
| --- | --- | --- |
| Zener 崩潰 | 強電場直接把電子從共價鍵拉出（量子穿隧） | 重摻雜、空乏區窄、$V_{BD} < 5\ \text{V}$ 左右 |
| 雪崩崩潰 | 載子被電場加速到能量超過 $E_g$，撞擊晶格產生新電子電洞對，連鎖反應 | 輕摻雜、空乏區寬、$V_{BD}$ 較高 |

## 整條鏈一頁看

```
共價鍵 + kT ──Boltzmann──▶ n_i ──摻雜──▶ n ≈ N_D, p = n_i²/N_D
                                                │
        漂移 J = qμnE  ◀── 同一組隨機碰撞 ──▶  擴散 J = qD dn/dx
                  └────── Einstein: D/μ = V_T ──────┘
                                    │
                      P|N 並排，漂移 + 擴散 = 0（ODE）
                                    │
                          V_0 = V_T ln(N_A N_D / n_i²)
                                    │
              加 V_D 降障壁 ──▶ 少數載子 × e^{V_D/V_T} ──▶ I = I_S(e^{V_D/V_T} − 1)
```
