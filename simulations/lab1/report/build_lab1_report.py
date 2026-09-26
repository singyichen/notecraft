"""Lab 1（Diode）結報：把基礎實驗（一、二）與進階實驗 I（三：半波整流）已經有的模擬素材
先填進助教格式，實測欄位留黃底。

用法（在 simulations/lab1/）：
  .venv/bin/python report/build_lab1_report.py --id 515661xxx --name 陳欣怡
  → report/<學號>_<姓名>_Lab1.docx（已存在時要加 --force，否則不覆寫你手改過的檔）

measured/lab1-exp1-forward.csv、lab1-exp2-reverse.csv、lab1-exp3-halfwave.csv 填了數字再重跑，
實測表、疊圖與對照圖都會自動帶入。實驗三那份是純量記錄表（區段／量測項目／實測／預報／理想）。
"""
import argparse, csv, os, re, subprocess, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); LAB = os.path.join(HERE, '..'); ROOT = os.path.join(LAB, '..', '..')
sys.path.insert(0, os.path.join(LAB, '..', 'tools'))
from lab_report import Report, REQ, OPT, GREY
from ltraw import read_raw
IMG = os.path.join(ROOT, 'public', 'note-images'); BUILD = os.path.join(HERE, 'build')


def rows_csv(name):
    with open(os.path.join(LAB, 'measured', name), newline='', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


def has_data(rows, key='VD'):
    return any((r.get(key) or '').strip() for r in rows)


def rows_scalar(name):
    """實驗三、四的純量記錄表：區段, 量測項目, 實測, 預報_LTspice, 理想公式。"""
    return [r for r in rows_csv(name) if (r.get('量測項目') or '').strip()]


def sc(rows, sec, item, col='實測'):
    """取純量記錄表的一格；沒這一列或格子是空的就回 None，表格會留黃底待填。"""
    for r in rows:
        if r['區段'].startswith(sec) and r['量測項目'].startswith(item):
            return (r.get(col) or '').strip() or None
    return None


def lbl(t):
    """CSV 的 V_peak／V_rms 這種欄名補上大括號，add_runs 才認得下標。"""
    return re.sub(r'_([A-Za-z]+)', r'_{\1}', t)


def pct(v):
    """效率欄在 CSV 裡是小數（0.3823），報告裡印成百分比。"""
    try: return f'{float(v) * 100:.1f}%'
    except (TypeError, ValueError): return None


def err(meas, ref):
    try: return f'{(float(meas) - float(ref)) / float(ref) * 100:+.1f}%'
    except (TypeError, ValueError, ZeroDivisionError): return '—'


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
    m3 = rows_scalar('lab1-exp3-halfwave.csv')
    vs1, vd1, i1 = lt_exp1(); vs2, vd2, i2 = lt_exp2()
    got1, got2, got3 = has_data(m1), has_data(m2), has_data(m3, '實測')
    if got1:
        subprocess.run([sys.executable, os.path.join(LAB, 'plot_measured.py'), os.path.join(LAB, 'measured', 'lab1-exp1-forward.csv'), os.path.join(LAB, 'measured', 'lab1-exp1-tinkercad.csv'), '--out', BUILD], check=True)
    if got2:
        subprocess.run([sys.executable, os.path.join(LAB, 'plot_measured.py'), '--exp', '2', os.path.join(LAB, 'measured', 'lab1-exp2-reverse.csv'), '--out', BUILD], check=True)
    if got3:
        subprocess.run([sys.executable, os.path.join(LAB, 'plot_measured.py'), '--exp', '3', os.path.join(LAB, 'measured', 'lab1-exp3-halfwave.csv'), '--out', BUILD], check=True)

    r = Report(1, '二極體（Diode）：順偏導通電壓、逆偏與半波整流', a.name, a.id)
    r.legend()

    # 一、實驗目的
    r.h1('實驗目的')
    r.draft('本次做基礎實驗（A 方案）的實驗一「順偏：導通電壓」與實驗二「逆偏」，並加做進階實驗 I「半波整流器」。前兩個實驗以 1N4007 串聯 1 kΩ 限流電阻，用直流電源逐點改變外加電壓，同時量二極體跨壓 V_{D} 與迴路電流 I，畫出 I-V 特性曲線；第三個實驗把同一顆二極體改接到 60 Hz 正弦輸入上，看它的單向導通如何把交流變成脈動直流。')
    r.bullets(['順偏：V_{s} 由 0 V 起每次加 0.1 V 到 2 V，觀察電流由幾乎為零轉為指數上升，從曲線讀出導通電壓（knee voltage），並與課本的 0.7 V 定電壓模型比較。',
               '逆偏：二極體反接，V_{s} 每次加 1 V 到 20 V，量測微小的逆向漏電流，確認二極體呈高阻抗；並說明 1N4007 的崩潰電壓（1000 V）為何在本實驗量不到。',
               '把前兩個實驗的數據合成一條完整的二極體 I-V 曲線，理解二極體的非線性與單向導通特性。',
               '半波整流：輸入 60 Hz、10 Vpp 正弦，負載 10 kΩ，量 V_{in} 與 V_{out} 的 V_{peak}、V_{rms}、V_{avg} 並算整流效率；再把 1 µF 電容並聯在負載上，觀察漣波並用 RC 時間常數解釋它為什麼這麼大。'], highlight=None)
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
    r.h2('交流下的半波整流：為什麼只剩一半，三個數字又怎麼來')
    r.draft('把同一顆二極體接在 60 Hz 正弦輸入與 10 kΩ 負載之間，它每秒要面對 60 次順偏與 60 次逆偏：正半週且 V_{in} > V_{D,on} 時導通，輸出約為 V_{in} − V_{D,on}；負半週逆偏截止、電流近似為零，負載把輸出端拉回地，所以 V_{out} ≈ 0。示波器上看到的因此不是完整正弦，而是只留正半週的**脈動直流（pulsating DC）**——「直流」只要求極性不變，不要求數值固定。')
    r.draft('理想化之後（先把二極體壓降放一邊，它只是把峰值從 V_{in,peak} 降到 V_{p}），半波整流在數學上只做一件事：把所有積分的區間從一整個週期縮成前半個週期。取 ω = 2πf、T = 2π/ω，直接積分可得平均值與均方根：')
    r.equation('V_{avg} = (1/T)∫_{0}^{T/2} V_{p} sin ωt dt = V_{p}/π ≈ 0.318 V_{p}')
    r.equation('V_{rms} = √[ (1/T)∫_{0}^{T/2} V_{p}^{2} sin^{2} ωt dt ] = V_{p}/2')
    r.draft('整流效率定義為直流功率除以輸出的交流功率。負載 R 在分子分母都會消掉，所以它是一個和 V_{p}、R、f 全都無關的純數：')
    r.equation('η = P_{dc}/P_{ac} = (V_{avg}^{2}/R) / (V_{rms}^{2}/R) = (V_{p}/π)^{2} / (V_{p}/2)^{2} = 4/π^{2} ≈ 40.6%')
    r.draft('40.6% 是理想上限，純粹是「把半個週期砍掉」這個動作的代價；實測一定更低，因為二極體壓降先把輸出峰值吃掉一塊。並聯濾波電容後，二極體導通時電容被充到峰值、截止時改由電容供應負載並放電，把放電電流近似成定值 V_{p}/R_{L}、要撐的時間近似成一整個週期 1/f，由 I = C·dV/dt 得漣波：')
    r.equation('V_{R} ≈ I_{L}/(f C) = V_{p}/(R_{L} C f)')
    r.draft('因次檢查：Ω·F = (V/A)·(C/V) = C/A = s，所以 V/(Ω·F·s^{−1}) = V，量綱正確。代進本實驗的值，R_{L}C = 10 kΩ × 1 µF = 10 ms，而一個週期 1/f = 16.7 ms，兩者同量級——電容在下一個峰值來之前幾乎放光，這條線性近似算出的 V_{R} ≈ 7.2 V 比峰值本身還大，等於在告訴你近似已經失效。所以本實驗**預期**看到的是深鋸齒而不是小漣波，這正是講義要求比較有無電容兩種波形的用意。')
    r.figure(svg_png(os.path.join(LAB, 'kicad', 'lab1-exp3-halfwave.svg')), '實驗三半波整流量測電路（KiCad 繪製）：CH1 跨 V_{in} 與地、CH2 跨 V_{out} 與地，兩個通道共地；C1 是講義第 20 頁才並上去的，第 18 頁的量測先不要接。', 12)

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
    r.h2('實驗三：半波整流器')
    r.para('設計名稱「Half-Wave Rectifier」，沿用同一張板子的版面：函數波產生器接電源軌（Sine、60 Hz、Amplitude 10、DC offset 0——Tinkercad 的 Amplitude 欄是**峰對峰值**），二極體橫插 i 列第 5–9 欄（陽極在第 5 欄），10 kΩ 負載在 h 列第 9–13 欄，第 9 欄就是 V_{out}；兩台示波器的負探棒都夾在同一條 − 軌。講義第 20 頁的 1 µF 電容插在 g 列第 9、10 欄，再補一條第 10 欄到 − 軌的跳線，才真的與負載並聯。')
    r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp3-breadboard.png'), 'Tinkercad 實驗三第一部分（無濾波電容）：左邊示波器是 V_{in} 的完整正弦，右邊 V_{out} 的負半週被二極體切掉，只剩一座座山丘。', 12)
    r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp3-breadboard-rc.png'), 'Tinkercad 實驗三第二部分（負載並聯 1 µF）：輸出從一座座山丘變成鋸齒，峰頂之後沿著放電斜坡下降。', 12)
    r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp3-schematic.png'), 'Tinkercad 自動產生的線路圖（不畫示波器）：V_{in} → D1 → 第 9 欄（V_{out}）→ 10 kΩ → 地。', 7)
    r.draft('Tinkercad 的示波器只顯示波形、讀不到 Maximum／RMS／Average 這類數值，所以實驗三用它確認接線與兩個現象——負半週被切掉、加電容後變成鋸齒——數值一律以 LTspice 預報與實測為準。另外 Tinkercad 的求解器在 60 Hz 下偶爾會讓 V_{in} 的峰頂出現折點或被壓平，遇到這種畫面時該輪的波形整批作廢，並不是接線錯誤。')

    # 四、實驗數據與結果
    r.page_break()
    r.h1('實驗數據與結果')
    r.h2('麵包板電路', REQ)
    r.box('實驗一（順偏）實作麵包板電路照片：要看得到色環方向、電表探棒位置'); r.box('實驗二（逆偏）實作麵包板電路照片：色環端朝電源正端')
    r.box('實驗三（半波，無電容）實作麵包板電路照片：看得出色環端朝負載側，兩支探棒的地夾在同一條負軌')
    r.box('實驗三（半波，並聯 1 µF）實作麵包板電路照片：電容跨在 Vout 與地，和 10 kΩ 同一組節點')
    r.h2('示波器結果照片／圖片', '（必要：若有使用到示波器）')
    r.para('基礎實驗（實驗一、二）只用直流電源供應器 GPE-3323 與數位電表 GDM-532，沒有用到示波器。進階實驗 I（半波整流）用 DSOX1200 的 Gen Out 當訊號源，CH1、CH2 同畫面量 V_{in} 與 V_{out}。')
    r.box('實驗三（無電容）示波器畫面：CH1 的 Vin 與 CH2 的 Vout 同畫面，[Meas] 的 Maximum／DC RMS／Average 讀值要入鏡')
    r.box('實驗三（並聯 1 µF）示波器畫面：同上，另外要看得出漣波的谷值，充電段與放電段都框進畫面')
    r.para('兩張畫面都用 [Save/Recall] 存到 USB，不要用手機翻拍螢幕——翻拍照看不清讀值。', size=9.5, color=GREY)
    r.todo('若另外加做進階實驗 II（全波橋式整流），在此再放一組 V_{in}／V_{out} 的示波器畫面；沒做就刪掉這句。')
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
    r.h3('進階實驗 I：半波整流器', OPT)
    r.para('器材：DSOX1200 示波器（G 型號的 Gen Out 當訊號源、CH1／CH2 量測）、1N4007、10 kΩ（1/4 W）、1 µF。[Wave Gen] 設 Sine、60 Hz、10 Vpp、偏移 0，輸出負載選**高-Z**（選 50 Ω 時 10 kΩ 負載上的振幅會是設定值的兩倍）；CH1 跨 V_{in} 與地、CH2 跨 V_{out} 與地，兩個地夾接同一條負軌，[Meas] 加 Maximum、DC RMS、Average 三項。先量講義第 18 頁的無電容電路，再把 1 µF 並在 10 kΩ 兩端量第 20 頁。')
    r.table(['電路', '訊號', 'V_{peak} (V)', 'V_{rms} (V)', 'V_{avg} (V)', 'η = V_{avg}^{2}/V_{rms}^{2}', '漣波 V_{R} (V)'],
            [['半波，無 C（第 18 頁）', 'V_{in}', sc(m3, '輸入', 'V_peak'), sc(m3, '輸入', 'V_rms'), '—', '—', '—'],
             ['半波，無 C（第 18 頁）', 'V_{out}', sc(m3, '輸出 無 C', 'V_peak'), sc(m3, '輸出 無 C', 'V_rms'), sc(m3, '輸出 無 C', 'V_avg'), pct(sc(m3, '推算值', '整流效率 η（無 C）')), '—'],
             ['半波 + 1 µF（第 20 頁）', 'V_{out}', sc(m3, '輸出 加 1', 'V_peak'), sc(m3, '輸出 加 1', 'V_rms'), sc(m3, '輸出 加 1', 'V_avg'), pct(sc(m3, '推算值', '整流效率 η（加 1')), sc(m3, '輸出 加 1', '漣波')]],
            caption='實驗三實測數據（須與當天上傳 E3 的一致）')
    r.para('V_{avg} 欄不要留空——效率是用它和 V_{rms} 算出來的，不是另外量的。V_{in} 那一列沒有 V_{avg} 與效率：輸入是對稱正弦，平均值為零。', size=9.5, color=GREY)
    if got3: r.figure(os.path.join(BUILD, 'exp3-compare.png'), '實驗三：實測、LTspice 預報與理想公式的逐項對照（右圖為整流效率）。', 15)
    else: r.box('實驗三 實測 vs 預報對照圖。填好 measured/lab1-exp3-halfwave.csv 後重跑本腳本會自動帶入')
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
    r.h2('半波整流：峰值、效率與漣波')
    r.draft('**輸出峰值少掉多少。** 比較 V_{in,peak} 與 V_{out,peak}，差值應該接近一個二極體壓降，但不會剛好是 0.7 V。半波整流的峰值電流只有約 (5 − 0.6)/10 kΩ ≈ 0.44 mA，比實驗一掃到的最大電流（約 1.4 mA）還小，而由二極體方程式每十倍電流才差 n V_{T} ln10 ≈ 83 mV，所以電流越小壓降越低——LTspice 在這個條件下給 0.56 V。這就是常數電壓模型的適用範圍問題：0.7 V 是 10 mA 量級的說法，拿到 0.4 mA 上會高估。')
    r.draft('**效率差在哪。** 理想上限 4/π² = 40.6% 的推導見「實驗原理」，它和 V_{p}、R、f 都無關。實測一定更低，主因是二極體壓降先讓輸出峰值少一塊（4.44 V 而非 5 V），其次是示波器讀值的取樣與量化誤差；LTspice 算出 38.2%。不要把差異寫成「儀器誤差」就結束。')
    r.draft('**漣波為什麼這麼大。** R_{L}C = 10 ms、一個週期 1/f = 16.7 ms，電容撐不過一次空檔，所以看到的是深鋸齒而不是平穩直流。把 V_{R} ≈ V_{p}/(R_{L}Cf) 反解，要讓漣波降到峰值的 5–10%（即 V_{R} ≈ 0.22–0.44 V）需要 C ≈ 16–33 µF；LTspice 掃 10 µF 得 0.61 V、100 µF 得 0.07 V，和這個估計一致。這也說明為什麼線性近似在 1 µF 算出比峰值還大的 7.2 V：前提「電容只放掉一小部分」在這組參數下根本不成立。')
    r.table(['區段', '量', '理想公式', 'LTspice 1N4007', '實測', '誤差 vs LTspice'],
            [[lbl(x['區段'].replace('輸出 ', '').replace('輸入 ', '')), lbl(x['量測項目']),
              (pct(x['理想公式']) if '效率' in x['量測項目'] else x['理想公式']) or '—',
              (pct(x['預報_LTspice']) if '效率' in x['量測項目'] else x['預報_LTspice']) or '—',
              (pct(x['實測']) if '效率' in x['量測項目'] else (x['實測'] or None)) or None,
              err(x['實測'], x['預報_LTspice'])] for x in m3],
            caption='實驗三逐項對照（實測欄填好 measured/lab1-exp3-halfwave.csv 後重跑本腳本會自動帶入）')
    r.todo('把上表的實測欄填完，並依序回答四件事：(1) 輸出峰值少掉多少、為什麼不是剛好 0.7 V；(2) 量到的效率和 40.6% 差多少、差在哪；(3) 加電容前後輸出差在哪，用 RC 與週期的比值解釋，並算出要讓漣波降到峰值 5–10% 需要多大的電容；(4) 實測與 LTspice 逐項比，差異超過一成要指出是哪一項先偏掉的。')
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
    r.para('使用 LTspice 內建元件庫的 Diodes Inc. 1N4007 參數（I_{S} = 90 pA、n = 1.4、R_{S} = 40 mΩ、BV = 1000 V），.model 內嵌於網表。實驗一以 .dc 掃 V_{s} 0→2 V；實驗二把二極體反接掃 0→20 V，另掃到 1200 V 觀察崩潰；實驗三改用 .tran 暫態分析，並以 .step param 掃三種電容值。')
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
    r.h4('實驗三：半波整流的暫態分析與電容掃描')
    r.para('輸入改成 SINE(0 5 60)，先跑無電容的 50 ms 看波形，再用 .step param 掃 C = 1 µF／10 µF／100 µF 並跑到 3 s 讓濾波電容進入穩態（濾波電容大時只跑 50 ms 還沒到穩態，漣波會算錯）。峰值、rms、平均與漣波都取穩態最後兩個週期、以時間加權計算。')
    r.code(open(os.path.join(LAB, 'lab1-exp3-halfwave-rc.cir'), encoding='utf-8').read())
    r.figure(os.path.join(IMG, 'ec-week3-ltspice', 'exp3-halfwave.png'), 'LTspice 實驗三（無電容）：V_{in} 為 ±5 V 正弦，V_{out} 只剩正半週，峰值 4.44 V，比輸入低一個二極體壓降 0.56 V。', 15)
    r.figure(os.path.join(IMG, 'ec-week3-ltspice', 'exp3-halfwave-rc.png'), 'LTspice 實驗三（電容掃描）：同一個電路，C 從 1 µF 加到 100 µF，漣波從 3.22 V 降到 0.07 V。', 15)
    r.table(['C', 'V_{peak} (V)', '谷底 (V)', '漣波 V_{R} (V)', 'R_{L}C', '線性近似 V_{p}/(R_{L}Cf)'],
            [['無 C', '4.442', '0.000', '4.442（整個半週）', '—', '—'],
             ['1 µF', '4.440', '1.218', '3.222', '10 ms', '7.2 V（近似失效）'],
             ['10 µF', '4.411', '3.803', '0.608', '100 ms', '0.72 V'],
             ['100 µF', '4.347', '4.281', '0.066', '1 s', '0.072 V']],
            caption='LTspice 電容掃描：R_{L}C 明顯大於週期 16.7 ms 之後，線性近似才開始可用', todo_blank=False)
    r.todo('把實測的兩組波形（無電容、1 µF）和上面兩張 LTspice 圖並排比較，指出峰值、谷底、漣波三者哪一項先偏離，以及可能原因（電容實際容量的誤差通常有 ±10–20%、示波器探棒的 10 MΩ 也會參與放電）。')
    r.h2('KiCad：電路圖與 ERC')
    r.para('三張量測電路圖以 KiCad 10 繪製（見「實驗原理」的圖），電氣規則檢查（ERC）零違規；由原理圖匯出的 SPICE 網表與手寫的 LTspice 網表拓樸相同（實驗一、二為 V1 → D1 → R1 → 0 V 電壓源形式的電流表 → GND，實驗三為 Vin → D1 → R1 ∥ C1 → GND）。')
    r.save(out, a.force)


if __name__ == '__main__':
    main()
