"""Lab 1（Diode）結報：把實驗一、二已經有的模擬素材先填進助教格式，實測欄位留黃底。

用法（在 simulations/lab1/）：
  .venv/bin/python report/build_lab1_report.py --id 515661xxx --name 陳欣怡
  → report/<學號>_<姓名>_Lab1.docx（已存在時要加 --force，否則不覆寫你手改過的檔）

measured/lab1-exp1-forward.csv、lab1-exp2-reverse.csv 填了數字再重跑，實測表與疊圖會自動帶入。
"""
import argparse, csv, os, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); LAB = os.path.join(HERE, '..'); ROOT = os.path.join(LAB, '..', '..')
sys.path.insert(0, os.path.join(LAB, '..', 'tools'))
from lab_report import Report, REQ, OPT
from ltraw import read_raw
IMG = os.path.join(ROOT, 'public', 'note-images'); BUILD = os.path.join(HERE, 'build')


def rows_csv(name):
    with open(os.path.join(LAB, 'measured', name), newline='', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


def has_data(rows, key='VD'):
    return any((r.get(key) or '').strip() for r in rows)


def svg_png(svg, width=1500):
    os.makedirs(BUILD, exist_ok=True)
    out = os.path.join(BUILD, os.path.basename(svg).replace('.svg', '.png'))
    tmp = out.replace('.png', '.svg')   # KiCad 佈景的米色底改白，印出來才乾淨
    open(tmp, 'w', encoding='utf-8').write(open(svg, encoding='utf-8').read().replace('#F5F4EF', '#FFFFFF'))
    subprocess.run(['rsvg-convert', '-w', str(width), '-b', 'white', tmp, '-o', out], check=True); os.remove(tmp)
    return out


def lt_exp1():
    _, st = read_raw(os.path.join(LAB, 'lab1-exp1-forward.raw')); s = st[0]
    return s['Vs'], s['V(a)'], s['I(D1)'] * 1e3


def lt_exp2():
    _, st = read_raw(os.path.join(LAB, 'lab1-exp2-reverse.raw')); s = st[0]
    return s['Vs'], s['V(k)'], -s['I(D1)'] * 1e9


def at(x, y, v):
    return float(y[int(np.argmin(np.abs(x - v)))])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', default='5156610◯◯'); ap.add_argument('--name', default='陳欣怡')
    ap.add_argument('-o', '--out'); ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    sid_file = a.id if '◯' not in a.id else '學號'
    out = a.out or os.path.join(HERE, f'{sid_file}_{a.name}_Lab1.docx')

    m1, m2 = rows_csv('lab1-exp1-forward.csv'), rows_csv('lab1-exp2-reverse.csv')
    t1, t2 = rows_csv('lab1-exp1-tinkercad.csv'), rows_csv('lab1-exp2-tinkercad.csv')
    vs1, vd1, i1 = lt_exp1(); vs2, vd2, i2 = lt_exp2()
    got1, got2 = has_data(m1), has_data(m2)
    if got1:
        subprocess.run([sys.executable, os.path.join(LAB, 'plot_measured.py'), os.path.join(LAB, 'measured', 'lab1-exp1-forward.csv'), os.path.join(LAB, 'measured', 'lab1-exp1-tinkercad.csv'), '--out', BUILD], check=True)
    if got2:
        subprocess.run([sys.executable, os.path.join(LAB, 'plot_measured.py'), '--exp', '2', os.path.join(LAB, 'measured', 'lab1-exp2-reverse.csv'), '--out', BUILD], check=True)

    r = Report(1, '二極體（Diode）：順偏導通電壓與逆偏', a.name, a.id)
    r.legend()

    # 一、實驗目的
    r.h1('實驗目的')
    r.draft('本次選做基礎實驗（A 方案）：實驗一「順偏：導通電壓」與實驗二「逆偏」。以 1N4007 串聯 1 kΩ 限流電阻，用直流電源逐點改變外加電壓，同時量二極體跨壓 V_{D} 與迴路電流 I，畫出 I-V 特性曲線。')
    r.bullets(['順偏：V_{s} 由 0 V 起每次加 0.1 V 到 2 V，觀察電流由幾乎為零轉為指數上升，從曲線讀出導通電壓（knee voltage），並與課本的 0.7 V 定電壓模型比較。',
               '逆偏：二極體反接，V_{s} 每次加 1 V 到 20 V，量測微小的逆向漏電流，確認二極體呈高阻抗；並說明 1N4007 的崩潰電壓（1000 V）為何在本實驗量不到。',
               '把兩個實驗的數據合成一條完整的二極體 I-V 曲線，理解二極體的非線性與單向導通特性。'], highlight=None)
    r.todo('用一兩句話寫你自己做這個實驗想確認什麼（例如：想知道實際的導通電壓是不是 0.7 V）。')

    # 二、實驗原理
    r.h1('實驗原理')
    r.h2('PN 接面與順向偏壓')
    r.draft('二極體由 P 型與 N 型半導體接合而成，接面兩側的多數載子互相擴散後留下不可移動的離子，形成空乏區與內建電位障。外加電壓正端接 P、負端接 N（順偏）時，外加電場抵消部分內建電場，空乏區變窄、位障降低，能跨過位障的多數載子數目依 Boltzmann 因子呈指數增加，電流因此隨 V_{D} 指數上升：')
    r.equation('I = I_{S} ( e^{V_{D} / (n V_{T})} − 1 )，  V_{T} = kT/q ≈ 25.85 mV（300 K）')
    r.draft('I_{S} 為逆向飽和電流、n 為理想因子（1N4007 的 SPICE 模型 n = 1.4、I_{S} = 90 pA）。由上式，電流每增加十倍，V_{D} 只需增加 n V_{T} ln10 ≈ 83 mV，所以「導通電壓」不是曲線上的數學轉折點，而是取決於把「明顯導通」定在多大電流：課本的 0.7 V 對應約 10 mA，本實驗最大電流只有 1.4 mA，預期讀到 0.55–0.60 V。')
    r.h2('逆向偏壓、漏電流與崩潰')
    r.draft('逆偏時外加電場與內建電場同向，空乏區變寬、位障升高，多數載子無法擴散通過，只剩由少數載子漂移形成的極小漏電流（≈ I_{S}，與溫度有關、幾乎與電壓無關）。逆向電壓超過崩潰電壓 V_{BR} 時電流急遽增加：重摻雜、低電壓時是強電場直接扯斷共價鍵的齊納崩潰；輕摻雜、高電壓時是載子被加速後碰撞游離、連鎖倍增的突崩崩潰。1N4007 的 V_{BR} 額定 1000 V，規格書的逆向漏電流上限為 5 µA（25 °C、1000 V）。')
    r.h2('量測電路：限流電阻與 KVL')
    r.draft('電源、二極體、電阻串成單一迴路，電流處處相同。由克希荷夫電壓定律與歐姆定律：')
    r.equation('V_{s} = V_{D} + I·R  ⇒  I = (V_{s} − V_{D}) / R，  R = 1 kΩ')
    r.draft('二極體導通後動態電阻只有數十歐姆，若沒有限流電阻，電流只受電源能力限制，二極體會過熱燒毀或觸發電源的定電流保護；有了 1 kΩ，導通後多出來的電源電壓幾乎全落在電阻上，最大電流約 (2 − 0.7)/1 kΩ = 1.3 mA。上式也是每一列數據的驗算式：用 V_{R}/R 算出的電流應與電流表讀值一致。')
    r.figure(svg_png(os.path.join(LAB, 'kicad', 'lab1-exp1-forward.svg')), '實驗一順偏量測電路（KiCad 繪製）：電壓表跨在 D1 兩端讀 V_{D}，電流表串在 R1 之後讀 I。', 10.5)
    r.figure(svg_png(os.path.join(LAB, 'kicad', 'lab1-exp2-reverse.svg')), '實驗二逆偏量測電路（KiCad 繪製）：D1 反接，陰極朝電源正端，電流表改用 µA 檔。', 10.5)

    # 三、Tinkercad
    r.page_break()
    r.h1('Tinkercad 模擬')
    r.h2('實驗一：順偏')
    r.para('設計名稱「Forward Bias: Knee Voltage」。元件橫插在麵包板上半區：二極體在 i 列第 5–9 欄（陽極第 5 欄）、1 kΩ 電阻在 h 列第 9–13 欄，電源接上方電源軌；左側萬用表切電壓檔跨在二極體兩端，右側切安培檔串在電阻與 − 軌之間。')
    r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp1-breadboard.png'), 'Tinkercad 實驗一模擬畫面：V_{s} = 0.7 V 時 V_{D} = 494 mV、I = 206 µA。', 12)
    r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp1-schematic.png'), 'Tinkercad 自動產生的線路圖（不畫電表，兩個開放端是電流表的位置）。', 7)
    r.table(['V_{s} (V)', 'V_{D} (V)', 'I (mA)', 'V_{s} (V)', 'V_{D} (V)', 'I (mA)'],
            [[t1[k]['Vs'], t1[k]['VD'], t1[k]['I_mA'], t1[k + 10]['Vs'], t1[k + 10]['VD'], t1[k + 10]['I_mA']] for k in range(10)],
            caption='Tinkercad 實驗一掃描結果（開著模擬逐點改電源電壓，抄兩台萬用表）')
    r.h2('實驗二：逆偏')
    r.para('設計名稱「Reverse Bias」。與實驗一同一張板子，只把二極體轉 180°（色環端改在第 5 欄、朝 + 軌），電源改為每次加 1 V。')
    r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp2-breadboard.png'), 'Tinkercad 實驗二模擬畫面：V_{s} = 10 V 時電壓表 10.0 V、電流表 0.00 A。', 12)
    r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp2-schematic.png'), 'Tinkercad 線路圖：P1+ 接到 D1 的陰極端，即逆偏。', 7)
    r.table(['V_{s} (V)', 'V_{D} (V)', 'I'], [[x['Vs'], x['VD'], '0.00 A'] for x in t2 if x['Vs'] in ('1', '5', '10', '15', '20')],
            caption='Tinkercad 實驗二掃描結果摘要（1–20 V 共 20 點，全部 V_{D} = V_{s}、I = 0）')
    r.draft('Tinkercad 的二極體是通用模型：順偏導通電壓約 0.51–0.54 V，比真實 1N4007 低；逆向電流是精確的零。電表也是理想儀器（電壓檔內阻無限大、電流檔內阻零），因此模擬值只用來確認接線與趨勢，不當作預期數值。')

    # 四、實驗數據與結果
    r.page_break()
    r.h1('實驗數據與結果')
    r.h2('麵包板電路', REQ)
    r.box('實驗一（順偏）實作麵包板電路照片：要看得到色環方向、電表探棒位置'); r.box('實驗二（逆偏）實作麵包板電路照片：色環端朝電源正端')
    r.h2('示波器結果照片／圖片', '（必要：若有使用到示波器）')
    r.para('基礎實驗（實驗一、二）只使用直流電源供應器 GPE-3323 與數位電表 GDM-532，未使用示波器。')
    r.todo('若加做進階實驗 I／II（半波、全波整流），在此放 V_{in}／V_{out} 的示波器照片；沒做就保留上面那句即可。')
    r.h2('實驗數據、表格', REQ)
    r.h3('基礎實驗', REQ)
    r.h4('實驗一：順偏導通電壓')
    r.para('器材：GPE-3323 CH1（電流上限 0.1 A）、GDM-532、1N4007、1 kΩ（1/4 W）。V_{s} 由 0.1 V 起每次加 0.1 V；V_{D} 以電表 V 檔跨接二極體量得，I 以 V_{R}/R 計算並與電流讀值互相驗證。')
    def f(v, fmt='{:.3f}'):
        try: return fmt.format(float(v))
        except (TypeError, ValueError): return None
    rows = []
    for x in m1:
        vd, im = f(x.get('VD')), f(x.get('I_mA'))
        vr = f(float(x['Vs']) - float(vd)) if vd else None
        rows.append([x['Vs'], vd, vr, vr, im])   # R = 1 kΩ：V_R (V) 的數值就是 I (mA)
    r.table(['V_{s} (V)', 'V_{D} (V)', 'V_{R} = V_{s} − V_{D} (V)', 'I = V_{R}/R (mA)', '電表 I (mA)'], rows, caption='實驗一實測數據（須與當天上傳 E3 的一致）')
    if got1: r.figure(os.path.join(BUILD, 'exp1-forward-overlay.png'), '實驗一 I-V 曲線：實測點與 Tinkercad 疊在 LTspice 1N4007 曲線上。', 15)
    else: r.box('實驗一 I-V 曲線圖（橫軸 V_{D}、縱軸 I）。填好 measured/lab1-exp1-forward.csv 後重跑本腳本會自動帶入'.replace('_{', '').replace('}', ''))
    r.h4('實驗二：逆偏')
    r.para('同一電路把 1N4007 反接，V_{s} 由 1 V 起每次加 1 V 到 20 V。電流表紅棒改插 µA 孔；10 V 與 20 V 兩列另外把電壓表探棒拿開再讀一次電流，用來分辨電壓表輸入阻抗分走的電流。')
    rows = [[x['Vs'], f(x.get('VD')), f(x.get('I_uA')), (f(float(x['Vs']) - float(x['VD'])) if f(x.get('VD')) else None), None if x['Vs'] in ('10', '20') else '—'] for x in m2]
    r.table(['V_{s} (V)', 'V_{D} (V)', 'I (µA)', 'V_{R} = V_{s} − V_{D} (V)', '拿掉電壓表後的 I (µA)'], rows, caption='實驗二實測數據（須與當天上傳 E3 的一致）')
    if got2: r.figure(os.path.join(BUILD, 'exp2-reverse-overlay.png'), '實驗二逆向電流（對數軸）與 V_{D}–V_{s} 關係。', 15)
    else: r.box('實驗二 I-V 曲線圖。填好 measured/lab1-exp2-reverse.csv 後重跑本腳本會自動帶入')
    r.todo('把實驗一、二的數據合畫成一條完整的二極體 I-V 曲線（逆偏畫在負電壓側；兩邊電流差六個數量級，需分兩個縱軸或取對數）。')
    r.h3('進階實驗 I：半波整流器', OPT); r.todo('有做才寫；沒做請刪除本小節。')
    r.h3('進階實驗 II：全波橋式整流器', OPT); r.todo('有做才寫；沒做請刪除本小節。只接受「基礎」「基礎＋進階 I」「基礎＋進階 I＋進階 II」三種組合。')

    # 五、實驗結果分析
    r.page_break()
    r.h1('實驗結果分析')
    r.h2('導通電壓：同一準則比較三組資料')
    r.draft('指數曲線沒有數學上的轉折點，因此先宣告判定準則，再對實測、Tinkercad、LTspice 各讀一次。準則一取電流達 1 mA 時的 V_{D}（相鄰兩列線性內插）；準則二取電流大於最大值一半的點做最小平方直線，外推到 I = 0 的截距。')
    r.table(['資料', '準則一：I = 1 mA 的 V_{D}', '準則二：切線交點', '陡段動態電阻', '最大電流'],
            [['課本定電壓模型', '0.7 V（約 10 mA 量級）', '—', '0 Ω', '1.30 mA'], ['LTspice 1N4007', '0.588 V', '0.551 V', '36 Ω', '1.40 mA'],
             ['Tinkercad', '0.535 V', '0.510 V', '24 Ω', '1.46 mA'], ['實測', None, None, None, None]], caption='導通電壓比較（實測列由 plot_measured.py 印出的表填入）')
    r.todo('寫出實測導通電壓、與 0.7 V／LTspice 的差距（百分比），並解釋：量測最大電流只到約 1.4 mA、每十倍電流 83 mV；其他誤差來源如電表內阻、電阻 ±0.5%、溫度、接觸電阻。')
    r.h2('逆向漏電流：量到的是二極體還是電壓表')
    r.draft('GDM-532 電壓檔輸入阻抗約 10 MΩ，跨在二極體兩端時形成一條並聯路徑，20 V 時流過電壓表的電流為 20 V / 10 MΩ = 2 µA，比 1N4007 的真實漏電流（LTspice：20 V 時 0.11 nA）大四個數量級，而這個電流同樣會流過串聯的電流表。')
    r.table(['量', '規格書', 'LTspice 1N4007', 'Tinkercad', '實測'],
            [['逆偏 20 V 的電流', '≤ 5 µA（1000 V、25 °C）', f'{at(vs2, i2, 20):.2f} nA', '0', None], ['電壓表 10 MΩ 分走的電流（20 V）', '2 µA', '不在模型內', '0（理想電表）', None],
             ['等效電阻 V_{D}/I（20 V）', '—', '1.8×10^{11} Ω', '∞', None], ['V_{R} = V_{s} − V_{D}（20 V）', '≈ 0', '0.1 µV', '0', None]], caption='逆偏量測比較')
    r.todo('依實測結果三選一來寫：(1) 電流與 V_{D}/10 MΩ 同量級，且拿掉電壓表後降到接近零 → 量到的是電壓表；(2) 明顯大於該值 → 二極體或麵包板接觸漏電；(3) 讀值為 0 → 寫「低於 µA 檔解析度」並以解析度為上界。')
    r.h2('講義問題')
    qs = [('實驗一 Q1：由 I-V 曲線估計的導通電壓為何？與理論值比較並解釋差異。', '引用上表；重點是導通電壓定義在某個電流上。'),
          ('實驗一 Q2：為何低於導通電壓時電流幾乎為零、超過後指數上升？', '空乏區變窄、位障降低 → 能跨過位障的多數載子數依 exp(V_{D}/nV_{T}) 增加。'),
          ('實驗一 Q3：限流電阻的角色？拿掉會怎樣？', '導通後動態電阻僅數十 Ω，電流只受電源限制 → 二極體過熱或電源進入 CC 保護。'),
          ('實驗二 Q1：由曲線估計的崩潰電壓？與規格書比較。', '量不到：V_{BR} = 1000 V，GPE-3323 最高 32 V；本實驗的逆偏曲線全程貼著橫軸。'),
          ('實驗二 Q2：崩潰現象；突崩與齊納機制的差別；為何一般二極體不宜操作在此區。', '齊納：強電場穿隧、重摻雜低電壓；突崩：碰撞游離連鎖倍增、高電壓；一般二極體未設計散熱與均勻崩潰，超過電流即永久損壞。'),
          ('實驗二 Q3：齊納穩壓電路中串聯電阻的角色？拿掉的後果？', '崩潰後 r_{d} 只有數 Ω，串聯電阻決定崩潰電流並吸收輸入與 V_{Z} 的差；拿掉則電流失控燒毀。')]
    for q, hint in qs:
        r.h4(q); r.draft(f'要點：{hint}'); r.todo('用自己的話回答，能引用自己的數據更好。')

    # 六、程式模擬分析
    r.page_break()
    r.h1('程式模擬分析', OPT)
    r.h2('LTspice：真實 1N4007 模型')
    r.para('使用 LTspice 內建元件庫的 Diodes Inc. 1N4007 參數（I_{S} = 90 pA、n = 1.4、R_{S} = 40 mΩ、BV = 1000 V），.model 內嵌於網表。實驗一以 .dc 掃 V_{s} 0→2 V；實驗二把二極體反接掃 0→20 V，另掃到 1200 V 觀察崩潰。')
    r.code(open(os.path.join(LAB, 'lab1-exp1-forward.cir'), encoding='utf-8').read())
    r.figure(os.path.join(IMG, 'ec-week3-ltspice', 'exp1-forward-iv.png'), 'LTspice 實驗一：左為 I_{D}–V_{D}，1 mA 時 V_{D} = 0.59 V；右為 V_{D}、V_{R} 對 V_{s}，導通後多出來的電壓落在電阻上。', 15)
    r.code(open(os.path.join(LAB, 'lab1-exp2-reverse.cir'), encoding='utf-8').read())
    r.figure(os.path.join(IMG, 'ec-week3-ltspice', 'exp2-reverse-iv.png'), 'LTspice 實驗二：20 V 內漏電流約 0.1 nA；掃到 1200 V 才在 1000 V 崩潰，實驗室電源無法到達。', 15)
    pick = (0.5, 0.7, 1.0, 1.5, 2.0); tk = {x['Vs']: x for x in t1}; mm = {x['Vs']: x for x in m1}
    r.table(['V_{s} (V)', 'LTspice V_{D} (V)', 'LTspice I (mA)', 'Tinkercad V_{D} (V)', 'Tinkercad I (mA)', '實測 V_{D} (V)', '實測 I (mA)'],
            [[f'{v:.1f}', f'{at(vs1, vd1, v):.3f}', f'{at(vs1, i1, v):.3f}', tk[f'{v:.1f}']['VD'], tk[f'{v:.1f}']['I_mA'], f(mm[f'{v:.1f}'].get('VD')), f(mm[f'{v:.1f}'].get('I_mA'))] for v in pick],
            caption='實驗一：LTspice、Tinkercad 與實測對照')
    r.figure(os.path.join(IMG, 'ec-week3-measured', 'exp1-forward-overlay.png'), 'Tinkercad 掃描點疊在 LTspice 曲線上：通用二極體模型比 1N4007 早導通約 0.05 V。', 15)
    r.todo('比較 LTspice 與實測：哪一段吻合、哪一段偏離，可能原因（模型的 I_{S}、n 是典型值，個別元件與溫度不同）。')
    r.h2('KiCad：電路圖與 ERC')
    r.para('兩張量測電路圖以 KiCad 10 繪製（見「實驗原理」的圖），電氣規則檢查（ERC）零違規；由原理圖匯出的 SPICE 網表與上面手寫的 LTspice 網表拓樸相同（V1 → D1 → R1 → 0 V 電壓源形式的電流表 → GND）。')
    r.save(out, a.force)


if __name__ == '__main__':
    main()
