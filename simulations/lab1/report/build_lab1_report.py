"""Lab 1（Diode）結報：把基礎實驗（一、二）與進階實驗 I（三：半波整流）已經有的模擬素材
先填進助教格式，實測欄位留黃底。

用法（在 simulations/lab1/）：
  .venv/bin/python report/build_lab1_report.py --id 515661xxx --name 陳欣怡
  → src/content/notes/_outputs/lab1/<學號>_<姓名>_Lab1.docx（已存在時要加 --force，否則不覆寫你手改過的檔）
  放在 notesDir 底下的 _outputs/ 是為了能在 NoteCraft 的講義庫直接預覽；該目錄不會被
  複製進 dist，正式站看不到（見 src/lib/references.ts 的 listLocalOutputTree）。

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
# 結報成品放進 notesDir 的 _outputs/：dev 的 /notes-assets/* 服務 notesDir 底下任何檔案，
# 但 build 只複製 _references/，所以帶著姓名學號的結報看得到、卻不會被發佈到公開站上。
OUT_DIR = os.path.join(ROOT, 'src', 'content', 'notes', '_outputs', 'lab1')


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
    return ('$' + re.sub(r'_([A-Za-z]+)', r'_{\1}', t) + '$') if '_' in t else t


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
    ap.add_argument('--advanced', action='store_true', help='加入進階實驗 I（半波整流）的章節；預設只有基礎實驗一、二')
    ap.add_argument('--instructor', default='林尚亭'); ap.add_argument('--ta', default='林承恩')
    ap.add_argument('--final', action='store_true', help='交件版：不印使用說明、拿掉草稿／待填的底色與標記，待填處填入寫好的內容')
    a = ap.parse_args(); adv = a.advanced
    sid_file = a.id if '◯' not in a.id else '學號'
    out = a.out or os.path.join(OUT_DIR, f'{sid_file}_{a.name}_Lab1.docx')
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)

    def f(v, fmt='{:.3f}'):
        try: return fmt.format(float(v))
        except (TypeError, ValueError): return None
    m1, m2 = rows_csv('lab1-exp1-forward.csv'), rows_csv('lab1-exp2-reverse.csv')
    t1, t2 = rows_csv('lab1-exp1-tinkercad.csv'), rows_csv('lab1-exp2-tinkercad.csv')
    m3 = rows_scalar('lab1-exp3-halfwave.csv')
    vs1, vd1, i1 = lt_exp1(); vs2, vd2, i2 = lt_exp2()
    got1, got2, got3 = has_data(m1), has_data(m2), has_data(m3, '實測')
    knee = {}   # plot_measured.py 印出的導通電壓表：資料名 → [準則一, 準則二, 動態電阻, 最大電流]
    if got1:
        res = subprocess.run([sys.executable, os.path.join(LAB, 'plot_measured.py'), os.path.join(LAB, 'measured', 'lab1-exp1-forward.csv'), '--points-only', '--out', BUILD], check=True, capture_output=True, text=True)   # 結報的圖只放實測點，不畫模擬曲線
        for line in res.stdout.splitlines():
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if len(cells) == 5 and cells[0] in ('LTspice 1N4007', 'forward', '實測', 'tinkercad'):
                knee['forward' if cells[0] == '實測' else cells[0]] = cells[1:]
        print(res.stdout)
    if got2:
        subprocess.run([sys.executable, os.path.join(LAB, 'plot_measured.py'), '--exp', '2', os.path.join(LAB, 'measured', 'lab1-exp2-reverse.csv'), '--points-only', '--out', BUILD], check=True)
    meas = knee.get('forward')
    def knee_v(k):
        try: return float(knee[k][0].split()[0])
        except (KeyError, ValueError, IndexError): return None
    v_meas, v_lt = knee_v('forward'), knee_v('LTspice 1N4007')
    m2_20 = next((x for x in m2 if x['Vs'] == '20'), None)
    i20 = f(m2_20.get('I_uA'), '{:.2f}') if m2_20 else None
    vr20 = f(float(m2_20['Vs']) - float(m2_20['VD'])) if m2_20 and f(m2_20.get('VD')) else None
    req20 = (f'{20 / (float(m2_20["I_uA"]) * 1e-6) / 1e6:.0f} MΩ' if m2_20 and f(m2_20.get('I_uA')) and float(m2_20['I_uA']) > 0 else None)
    photos = os.path.join(OUT_DIR, 'photos')
    if got3:
        subprocess.run([sys.executable, os.path.join(LAB, 'plot_measured.py'), '--exp', '3', os.path.join(LAB, 'measured', 'lab1-exp3-halfwave.csv'), '--out', BUILD], check=True)

    def build(toc=None):
        r = Report(1, '二極體（Diode）：順偏導通電壓、逆偏與半波整流' if adv else '二極體（Diode）：順偏導通電壓與逆偏', a.name, a.id, final=a.final, instructor=a.instructor, ta=a.ta, toc=toc)
        r.legend()

        # 一、實驗目的
        r.h1('實驗目的')
        r.draft('這次做的是基礎實驗（A 方案）的實驗一「順偏：導通電壓」跟實驗二「逆偏」' + ('，另外加做了進階實驗 I「半波整流器」' if adv else '') + '。電路很簡單，就是一顆 1N4007 串一顆 1 kΩ 電阻接到直流電源，順偏做完把二極體拔起來反過來插就變成逆偏。做法是把電源電壓一格一格往上調，每調一次就抄一次二極體兩端的電壓 $V_D$ 和電阻上的電壓 $V_R$（電流用 $V_R$ 除 1 kΩ 算出來），最後把這些點描成 I-V 曲線' + ('；進階實驗則是把同一顆二極體接到 60 Hz 的正弦輸入上，用示波器看它怎麼把交流變成只剩正半週。' if adv else '。'))
        r.bullets(['實驗一：$V_{s}$ 從 0 V 開始每次加 0.1 V，加到 2 V。想看的是電流什麼時候開始「衝」上去，從曲線上抓出導通電壓（knee voltage），再跟課本一直講的 0.7 V 比一比，看差多少。',
                   '實驗二：二極體反接，$V_{s}$ 改成每次加 1 V，加到 20 V，看逆向電流到底有多小、會不會跟著電壓變。講義還要我們估崩潰電壓，但 1N4007 的崩潰電壓是 1000 V、實驗室電源最多 32 V，做之前就知道一定量不到，這題只能查規格書。',
                   '最後把兩個實驗的點接在一起，看一條完整的二極體 I-V 曲線，順向跟逆向到底差多少。']
                  + (['進階實驗：輸入 60 Hz、10 Vpp 的正弦波，負載 10 kΩ，量 $V_{in}$ 和 $V_{out}$ 的 $V_{peak}$、$V_{rms}$、$V_{avg}$ 算整流效率；再把 1 µF 電容並在負載上看漣波，用 RC 時間常數想想它為什麼這麼大。'] if adv else []), highlight=None)
        r.para('我自己比較想知道的有兩件事。一是課本那個 0.7 V 到底準不準，我們自己量會不會也是 0.7 V，不是的話差在哪。二是逆偏的電流到底有多小，手上那台電表最小的檔位讀不讀得出來。') if a.final else r.todo('用一兩句話寫你自己做這個實驗想確認什麼（例如：想知道實際的導通電壓是不是 0.7 V）。')

        # 二、實驗原理
        r.h1('實驗原理')
        r.h2('PN 接面與順向偏壓')
        r.draft('我自己是這樣理解二極體的：P 型跟 N 型半導體接在一起，接面附近的電子和電洞先互相擴散、復合掉一批，留下一層沒有自由載子的空乏區，裡面剩下的固定離子形成一道內建的電位障。順偏（正端接 P、負端接 N）就是用外加電壓把這道牆壓低，牆一低，能翻過去的多數載子數量照 Boltzmann 因子長，也就是指數成長，所以電流會跟著 $V_D$ 指數上升。寫成式子就是課本的二極體方程式：')
        r.equation(r'I = I_S\left(\exp\left(\frac{V_D}{nV_T}\right)-1\right),\qquad V_T=\frac{kT}{q}\approx 25.85\ \text{mV}\ (300\ \text{K})')
        r.draft('$I_S$ 是逆向飽和電流、$n$ 叫理想因子，LTspice 的 1N4007 模型用的是 $n = 1.4$、$I_S = 90\\ \\text{pA}$。這條式子讓我想通一件事：所謂「導通電壓」其實沒有一個明確的點。電流每增加十倍，$V_D$ 只要多 $nV_T\\ln 10\\approx 83\\ \\text{mV}$，所以 0.7 V 只是「電流到 10 mA 左右」時的講法。我們這次最大只到 1.4 mA，照這樣算，進實驗室前我就預期會讀到 0.55 到 0.60 V 之間。')
        r.h2('逆向偏壓、漏電流與崩潰')
        r.draft('逆偏就是反過來：外加電場跟內建電場同方向，空乏區被拉寬、牆變更高，多數載子過不去，剩下的只有少數載子漂移過去造成的一點點漏電流。這個漏電流差不多就是 $I_S$，跟溫度有關、跟電壓幾乎沒關係，所以逆偏那段曲線理論上是平的。要一直加到崩潰電壓 $V_{BR}$ 電流才會突然變大，這有兩種機制：重摻雜、低電壓的是齊納崩潰，強電場直接把共價鍵的電子拉出來；輕摻雜、高電壓的是突崩崩潰，載子被加速後撞出更多載子、一路倍增。1N4007 的 $V_{BR}$ 額定 1000 V，規格書寫的逆向漏電流上限是 5 µA（25 °C、1000 V 時），所以在我們 20 V 以內的實驗，理論上什麼都看不到。')
        r.h2('量測電路：限流電阻與 KVL')
        r.draft('電源、二極體、電阻串成一個迴路，電流處處一樣，所以其實就是 KVL 加歐姆定律：')
        r.equation(r'V_s = V_D + IR \;\Rightarrow\; I=\frac{V_s-V_D}{R},\qquad R=1\ \text{k}\Omega')
        r.draft('限流電阻為什麼要放，我一開始沒特別想過，後來才想通：二極體導通之後動態電阻只剩幾十歐姆，沒有電阻的話電流只受電源能力限制，二極體可能燒掉，不然就是電源跳進定電流保護。有了 1 kΩ，導通後多出來的電壓幾乎都落在電阻上，最大電流大約 $\\frac{2-0.7}{1\\ \\text{k}\\Omega}=1.3\\ \\text{mA}$。這條式子後來也變成我每一列數據的驗算：$\\frac{V_R}{R}$ 算出來的電流應該跟量到的對得上。')
        r.figure(svg_png(os.path.join(LAB, 'kicad', 'lab1-exp1-forward.svg')), '實驗一順偏量測電路（KiCad 繪製）：電壓表跨在 D1 兩端讀 $V_{D}$，電流表串在 R1 之後讀 I。', 10.5)
        r.figure(svg_png(os.path.join(LAB, 'kicad', 'lab1-exp2-reverse.svg')), '實驗二逆偏量測電路（KiCad 繪製）：D1 反接，陰極朝電源正端，電流表改用 µA 檔。', 10.5)
        if adv:
            r.h2('交流下的半波整流：為什麼只剩一半，三個數字又怎麼來')
            r.draft('把同一顆二極體接在 60 Hz 正弦輸入與 10 kΩ 負載之間，它每秒要面對 60 次順偏與 60 次逆偏：正半週且 $V_{in}$ > $V_{D,on}$ 時導通，輸出約為 $V_{in}$ − $V_{D,on}$；負半週逆偏截止、電流近似為零，負載把輸出端拉回地，所以 $V_{out} \\approx 0$。示波器上看到的因此不是完整正弦，而是只留正半週的**脈動直流（pulsating DC）**——「直流」只要求極性不變，不要求數值固定。')
            r.draft('理想化之後（先把二極體壓降放一邊，它只是把峰值從 $V_{in,peak}$ 降到 $V_{p}$），半波整流在數學上只做一件事：把所有積分的區間從一整個週期縮成前半個週期。取 $\\omega = 2\\pi f$、$T = \\frac{2\\pi}{\\omega}$，直接積分可得平均值與均方根：')
            r.equation(r'V_{avg}=\frac{1}{T}\int_0^{T/2}V_p\sin\omega t\,dt=\frac{V_p}{\pi}\approx 0.318\,V_p')
            r.equation(r'V_{rms}=\sqrt{\frac{1}{T}\int_0^{T/2}V_p^2\sin^2\omega t\,dt}=\frac{V_p}{2}')
            r.draft('整流效率定義為直流功率除以輸出的交流功率。負載 R 在分子分母都會消掉，所以它是一個和 $V_{p}$、R、f 全都無關的純數：')
            r.equation(r'\eta=\frac{P_{dc}}{P_{ac}}=\frac{V_{avg}^2/R}{V_{rms}^2/R}=\frac{\left(\frac{V_p}{\pi}\right)^2}{\left(\frac{V_p}{2}\right)^2}=\frac{4}{\pi^2}\approx 40.6\%')
            r.draft('40.6% 是理想上限，純粹是「把半個週期砍掉」這個動作的代價；實測一定更低，因為二極體壓降先把輸出峰值吃掉一塊。並聯濾波電容後，二極體導通時電容被充到峰值、截止時改由電容供應負載並放電，把放電電流近似成定值 $V_{p}$/$R_{L}$、要撐的時間近似成一整個週期 1/f，由 $I = C\\frac{dV}{dt}$ 得漣波：')
            r.equation(r'V_R\approx\frac{I_L}{fC}=\frac{V_p}{R_L C f}')
            r.draft('因次檢查：$\\Omega\\cdot\\text{F} = \\frac{\\text{V}}{\\text{A}}\\cdot\\frac{\\text{C}}{\\text{V}} = \\frac{\\text{C}}{\\text{A}} = \\text{s}$，所以 $\\frac{\\text{V}}{\\Omega\\cdot\\text{F}\\cdot\\text{s}^{-1}} = \\text{V}$，量綱正確。代進本實驗的值，$R_L C = 10\\ \\text{k}\\Omega\\times 1\\ \\mu\\text{F} = 10\\ \\text{ms}$，而一個週期 $\\frac{1}{f} = 16.7\\ \\text{ms}$，兩者同量級——電容在下一個峰值來之前幾乎放光，這條線性近似算出的 $V_R \\approx 7.2\\ \\text{V}$ 比峰值本身還大，等於在告訴你近似已經失效。所以本實驗**預期**看到的是深鋸齒而不是小漣波，這正是講義要求比較有無電容兩種波形的用意。')
            r.figure(svg_png(os.path.join(LAB, 'kicad', 'lab1-exp3-halfwave.svg')), '實驗三半波整流量測電路（KiCad 繪製）：CH1 跨 $V_{in}$ 與地、CH2 跨 $V_{out}$ 與地，兩個通道共地；C1 是講義第 20 頁才並上去的，第 18 頁的量測先不要接。', 12)

        # 三、Tinkercad
        r.page_break()
        r.h1('Tinkercad 模擬')
        r.h2('實驗一：順偏')
        r.para('進實驗室前我先在 Tinkercad 把電路搭過一次，設計名稱「Forward Bias: Knee Voltage」。元件橫插在麵包板上半區：二極體在 i 列第 5 到 9 欄（陽極第 5 欄）、1 kΩ 電阻在 h 列第 9 到 13 欄，電源接上方電源軌；左邊那台萬用表切電壓檔跨在二極體兩端，右邊那台切安培檔串在電阻和 − 軌之間。主要是先確認接法沒錯、兩台電表要怎麼放，順便看一下趨勢。')
        r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp1-breadboard.png'), 'Tinkercad 實驗一模擬畫面：$V_s = 0.7\\ \\text{V}$ 時 $V_D = 494\\ \\text{mV}$、$I = 206\\ \\mu\\text{A}$。', 12)
        r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp1-schematic.png'), 'Tinkercad 自動產生的線路圖（不畫電表，兩個開放端是電流表的位置）。', 7)
        r.table(['$V_{s}$ (V)', '$V_{D}$ (V)', 'I (mA)', '$V_{s}$ (V)', '$V_{D}$ (V)', 'I (mA)'],
                [[t1[k]['Vs'], t1[k]['VD'], t1[k]['I_mA'], t1[k + 10]['Vs'], t1[k + 10]['VD'], t1[k + 10]['I_mA']] for k in range(10)],
                caption='Tinkercad 實驗一掃描結果（開著模擬逐點改電源電壓，抄兩台萬用表）')
        r.h2('實驗二：逆偏')
        r.para('實驗二沒另外搭，直接複製同一張板子存成「Reverse Bias」，只把二極體轉 180°（色環端改到第 5 欄、朝 + 軌），電源改成每次加 1 V。')
        r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp2-breadboard.png'), 'Tinkercad 實驗二模擬畫面：$V_s = 10\\ \\text{V}$ 時電壓表 10.0 V、電流表 0.00 A。', 12)
        r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp2-schematic.png'), 'Tinkercad 線路圖：P1+ 接到 D1 的陰極端，即逆偏。', 7)
        r.table(['$V_{s}$ (V)', '$V_{D}$ (V)', 'I'], [[x['Vs'], x['VD'], '0.00 A'] for x in t2 if x['Vs'] in ('1', '5', '10', '15', '20')],
                caption='Tinkercad 實驗二掃描結果摘要（1–20 V 共 20 點，全部 $V_D = V_s$、$I = 0$）')
        r.draft('Tinkercad 的二極體是通用模型，順偏大概 0.51 到 0.54 V 就導通了，比真的 1N4007 早一點；逆向電流則是精確的 0。電表也是理想的，電壓檔內阻無限大、電流檔內阻 0。所以我把模擬值當成確認接線跟看趨勢用，沒有拿來當預期數值，預期值是用 LTspice 算的。')
        if adv:
            r.h2('實驗三：半波整流器')
            r.para('設計名稱「Half-Wave Rectifier」，沿用同一張板子的版面：函數波產生器接電源軌（Sine、60 Hz、Amplitude 10、DC offset 0——Tinkercad 的 Amplitude 欄是**峰對峰值**），二極體橫插 i 列第 5–9 欄（陽極在第 5 欄），10 kΩ 負載在 h 列第 9–13 欄，第 9 欄就是 $V_{out}$；兩台示波器的負探棒都夾在同一條 − 軌。講義第 20 頁的 1 µF 電容插在 g 列第 9、10 欄，再補一條第 10 欄到 − 軌的跳線，才真的與負載並聯。')
            r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp3-breadboard.png'), 'Tinkercad 實驗三第一部分（無濾波電容）：左邊示波器是 $V_{in}$ 的完整正弦，右邊 $V_{out}$ 的負半週被二極體切掉，只剩一座座山丘。', 12)
            r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp3-breadboard-rc.png'), 'Tinkercad 實驗三第二部分（負載並聯 1 µF）：輸出從一座座山丘變成鋸齒，峰頂之後沿著放電斜坡下降。', 12)
            r.figure(os.path.join(IMG, 'ec-week3-tinkercad', 'lab1-exp3-schematic.png'), 'Tinkercad 自動產生的線路圖（不畫示波器）：$V_{in}$ → D1 → 第 9 欄（$V_{out}$）→ 10 kΩ → 地。', 7)
            r.draft('Tinkercad 的示波器只顯示波形、讀不到 Maximum／RMS／Average 這類數值，所以實驗三用它確認接線與兩個現象——負半週被切掉、加電容後變成鋸齒——數值一律以 LTspice 預報與實測為準。另外 Tinkercad 的求解器在 60 Hz 下偶爾會讓 $V_{in}$ 的峰頂出現折點或被壓平，遇到這種畫面時該輪的波形整批作廢，並不是接線錯誤。')

        # 四、實驗數據與結果
        r.page_break()
        r.h1('實驗數據與結果')
        r.h2('麵包板電路', REQ)
        def shot(name, cap, w=10.5):
            src = os.path.join(photos, name)
            if not os.path.exists(src):
                return r.box(cap)
            from PIL import Image
            im = Image.open(src).convert('RGB')
            if im.width > 1600:
                im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
            small = os.path.join(BUILD, name.rsplit('.', 1)[0] + '-small.jpg'); im.save(small, quality=85)
            r.figure(small, cap, w)
        shot('順向.jpg', '實驗一（順偏）麵包板接線：電源正極經跳線接 D1 1N4007 陽極（第 15 欄），色環端在第 20 欄，陰極串 1 kΩ 回到負極軌。')
        shot('順向全面.jpg', '實驗一量測現場：GPE-3323 CH1 供電、GDM-532 量 $V_{D}$ 與 $V_{R}$，筆電即時填入數據記錄簿。')
        shot('逆向.jpg', '實驗二（逆偏）麵包板接線：D1 反接，色環端朝電源正極，其餘與實驗一相同。')
        shot('逆向全面.jpg', '實驗二量測現場：電源由 1 V 掃到 20 V，電流由 1 kΩ 上的電壓（mV 檔）換算。')
        if adv:
            r.box('實驗三（半波，無電容）實作麵包板電路照片：看得出色環端朝負載側，兩支探棒的地夾在同一條負軌')
            r.box('實驗三（半波，並聯 1 µF）實作麵包板電路照片：電容跨在 Vout 與地，和 10 kΩ 同一組節點')
        r.h2('示波器結果照片／圖片', '（必要：若有使用到示波器）')
        r.para('基礎實驗（實驗一、二）只用直流電源供應器 GPE-3323 與數位電表 GDM-532，沒有使用示波器。' + ('進階實驗 I（半波整流）用 DSOX1200 的 Gen Out 當訊號源，CH1、CH2 同畫面量 $V_{in}$ 與 $V_{out}$。' if adv else ''))
        if adv:
            r.box('實驗三（無電容）示波器畫面：CH1 的 Vin 與 CH2 的 Vout 同畫面，[Meas] 的 Maximum／DC RMS／Average 讀值要入鏡')
            r.box('實驗三（並聯 1 µF）示波器畫面：同上，另外要看得出漣波的谷值，充電段與放電段都框進畫面')
            r.para('兩張畫面都用 [Save/Recall] 存到 USB，不要用手機翻拍螢幕——翻拍照看不清讀值。', size=9.5, color=GREY)
            r.todo('若另外加做進階實驗 II（全波橋式整流），在此再放一組 $V_{in}$／$V_{out}$ 的示波器畫面；沒做就刪掉這句。')
        r.h2('實驗數據、表格', REQ)
        r.h3('基礎實驗', REQ)
        r.h4('實驗一：順偏導通電壓')
        r.para('器材是 GPE-3323 的 CH1（電流上限設 0.1 A）、一台 GDM-532 電表、1N4007、1 kΩ（1/4 W）。$V_{s}$ 從 0.1 V 開始每次加 0.1 V；$V_{D}$ 用電表 V 檔跨在二極體兩端讀。因為只有一台電表，電流不是直接讀電流檔，而是把電表再跨到 1 kΩ 兩端讀 $V_{R}$，用實測的電阻值 999 Ω 換算 $I=\\frac{V_R}{999\\ \\Omega}$，再拿 $V_s - V_D$ 互相驗證。這是助教當天建議的量法，不用斷開電路把電流表串進去，也不會被電流表的內阻影響；他特別提醒換算要用電阻實測的 999 Ω，不是標稱的 1 kΩ。')
        rows = []
        for x in m1:
            vd, im = f(x.get('VD')), f(x.get('I_mA'))
            vr = f(float(x['Vs']) - float(vd)) if vd else None
            vr_meas = f(float(im) * 0.999) if im else None          # 電表讀到的 V_R = I × 999 Ω
            rows.append([x['Vs'], vd, vr, vr_meas, im])
        r.table(['$V_s$ (V)', '$V_D$ (V)', '$V_s - V_D$ (V)', '電表 $V_R$ (V)', '$I=\\frac{V_R}{999\\ \\Omega}$ (mA)'], rows, caption='實驗一實測數據')
        r.draft('$V_s \\ge 0.6\\ \\text{V}$ 之後，$V_s - V_D$ 跟電表直接量到的 $V_R$ 幾乎一樣（差 1–3%），KVL 有對上。0.1–0.5 V 那幾列兩者差了好幾 mV，我想是因為電流只有零點幾 µA，$V_R$ 已經貼到 mV 檔的最小位數，加上 $V_D$ 最後一位數的誤差被放大了。另外 $V_s = 0.4\\ \\text{V}$ 那一列我實際設到 0.42 V，表裡照實記。')
        if got1: r.figure(os.path.join(BUILD, 'exp1-forward-overlay.png'), '實驗一實測點：左為 I-V（$V_D$ 對 $I$），右為 $V_D$ 隨 $V_s$ 的變化。', 15)
        else: r.box('實驗一 I-V 曲線圖（橫軸 V_{D}、縱軸 I）。填好 measured/lab1-exp1-forward.csv 後重跑本腳本會自動帶入'.replace('_{', '').replace('}', ''))
        r.h4('實驗二：逆偏')
        r.para('同一個電路把 1N4007 拔起來反過來插，$V_{s}$ 從 1 V 開始每次加 1 V 加到 20 V。電流一樣是用 1 kΩ 上的電壓換算，不過電表 mV 檔讀到的 $V_{R}$ 只有 0.1 到 0.2 mV，已經是那個檔位的最後一位數了，所以換算出來的 I 只能當成「最多就這麼大」的上界。另外因為只有一台電表，量 $V_{R}$ 的時候電壓表並沒有跨在二極體上，講義裡「拿掉電壓表再量一次」那一步就不用另外做。')
        rows = [[x['Vs'], f(x.get('VD')), f(float(x['I_uA']) * 0.999, '{:.2f}') if f(x.get('I_uA')) else None, f(float(x['I_uA']) / 1000, '{:.5f}') if f(x.get('I_uA')) else None, f(x.get('I_uA'), '{:.2f}'), (f(float(x['Vs']) - float(x['VD'])) if f(x.get('VD')) else None)] for x in m2]   # 第 4 欄：10/3 上傳 E3 的原始值（mA 的數字被填進 µA 欄）
        r.table(['$V_s$ (V)', '$V_D$ (V)', '電表 $V_R$ (mV)', '當天上傳的 $I$ (µA)', '修正後 $I=\\frac{V_R}{999\\ \\Omega}$ (µA)', '$V_s - V_D$ (V)'], rows, caption='實驗二實測數據：「當天上傳」欄是 10/3 上傳 E3 的原始記錄，「修正後」欄是更正單位後的值（詳見下方說明）', col_widths=[1.6, 2.2, 2.4, 2.8, 3.6, 2.4])
        r.draft('$V_D$ 全程比 $V_s$ 高 0 到 0.09 V（所以 $V_s - V_D$ 是負的），表示電源電壓幾乎全部落在二極體上，電阻上量不到壓降。負值我判斷是電源面板顯示跟電表之間的校正差，不是電路本身的行為。另外一提，我第一次換算電流時把 mV ÷ Ω 算出來的 mA 直接當成 µA 填進記錄簿，數值小了一千倍，當天上傳 E3 的就是這個版本（表 4「當天上傳」欄原樣保留）；依助教提醒先核對單位再看量級是否合理，才發現並改回來，「修正後」欄就是把它乘以 1000。兩欄的 $V_D$ 與 $V_R$ 讀值完全相同，差的只有電流欄的單位。')
        if got2: r.figure(os.path.join(BUILD, 'exp2-reverse-overlay.png'), '實驗二實測點：左為逆向電流（對數軸），右為 $V_D$ 隨 $V_s$ 的變化。', 15)
        else: r.box('實驗二 I-V 曲線圖。填好 measured/lab1-exp2-reverse.csv 後重跑本腳本會自動帶入')
        if got1 and got2:
            import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
            plt.rcParams.update({'font.family': ['Heiti TC', 'Hiragino Sans', 'Arial Unicode MS', 'Arial'], 'axes.unicode_minus': False})
            fx = [float(x['VD']) for x in m1 if f(x.get('VD')) and f(x.get('I_mA'))]; fy = [float(x['I_mA']) for x in m1 if f(x.get('VD')) and f(x.get('I_mA'))]
            rx = [-float(x['VD']) for x in m2 if f(x.get('VD')) and f(x.get('I_uA'))]; ry = [-float(x['I_uA']) / 1000 for x in m2 if f(x.get('VD')) and f(x.get('I_uA'))]
            fig, ax = plt.subplots(figsize=(8.5, 3.8))
            ax.scatter(fx, fy, s=22, color='#1F4E79', zorder=3, label='實測 順偏（實驗一）')
            ax.scatter(rx, ry, s=22, color='#4E8F3A', zorder=3, label='實測 逆偏（實驗二）')
            ax.set_yscale('symlog', linthresh=1e-4); ax.axhline(0, color='#999', lw=.6); ax.axvline(0, color='#999', lw=.6)
            ax.set_xlabel('$V_D$ (V)'); ax.set_ylabel('$I$ (mA，symlog)'); ax.set_title('實驗一＋實驗二：二極體 I-V 實測點', fontsize=10.5)
            ax.grid(alpha=.3, which='both'); ax.legend(fontsize=8, loc='upper left'); fig.tight_layout()
            fig.savefig(os.path.join(BUILD, 'exp12-combined.png'), dpi=200); plt.close(fig)
            r.para('把兩個實驗的實測點合在同一張圖上，逆偏畫在負電壓側，不另外畫模擬曲線。兩邊的電流差了好幾個數量級，縱軸用對數（symlog）才看得到逆偏那段，不然它就是貼在零上的一排點；逆偏那幾個點其實是電表解析度的上界，不是真的量到那麼大的漏電流。')
            r.figure(os.path.join(BUILD, 'exp12-combined.png'), '實驗一與實驗二合成的二極體 I-V 實測點（縱軸 symlog）：右半邊指數上升、左半邊貼著橫軸。', 15)
        else:
            r.todo('把實驗一、二的數據合畫成一條完整的二極體 I-V 曲線（逆偏畫在負電壓側；兩邊電流差六個數量級，需分兩個縱軸或取對數）。')
        if adv:
            r.h3('進階實驗 I：半波整流器', OPT)
            r.para('器材：DSOX1200 示波器（G 型號的 Gen Out 當訊號源、CH1／CH2 量測）、1N4007、10 kΩ（1/4 W）、1 µF。[Wave Gen] 設 Sine、60 Hz、10 Vpp、偏移 0，輸出負載選**高-Z**（選 50 Ω 時 10 kΩ 負載上的振幅會是設定值的兩倍）；CH1 跨 $V_{in}$ 與地、CH2 跨 $V_{out}$ 與地，兩個地夾接同一條負軌，[Meas] 加 Maximum、DC RMS、Average 三項。先量講義第 18 頁的無電容電路，再把 1 µF 並在 10 kΩ 兩端量第 20 頁。')
            r.table(['電路', '訊號', '$V_{peak}$ (V)', '$V_{rms}$ (V)', '$V_{avg}$ (V)', '$\\eta = \\frac{V_{avg}^2}{V_{rms}^2}$', '漣波 $V_{R}$ (V)'],
                    [['半波，無 C（第 18 頁）', '$V_{in}$', sc(m3, 'V_in', 'V_peak'), sc(m3, 'V_in', 'V_rms'), '—', '—', '—'],
                     ['半波，無 C（第 18 頁）', '$V_{out}$', sc(m3, 'V_out (no C', 'V_peak'), sc(m3, 'V_out (no C', 'V_rms'), sc(m3, 'V_out (no C', 'V_avg'), pct(sc(m3, '推算值', '整流效率 η（無 C）')), '—'],
                     ['半波 + 1 µF（第 20 頁）', '$V_{out}$', sc(m3, 'V_out (C = 1', 'V_peak'), sc(m3, 'V_out (C = 1', 'V_rms'), sc(m3, 'V_out (C = 1', 'V_avg'), pct(sc(m3, '推算值', '整流效率 η（加 1')), sc(m3, 'V_out (C = 1', '漣波')]],
                    caption='實驗三實測數據')
            r.para('$V_{avg}$ 欄不要留空——效率是用它和 $V_{rms}$ 算出來的，不是另外量的。$V_{in}$ 那一列沒有 $V_{avg}$ 與效率：輸入是對稱正弦，平均值為零。', size=9.5, color=GREY)
            if got3: r.figure(os.path.join(BUILD, 'exp3-compare.png'), '實驗三：實測、LTspice 預報與理想公式的逐項對照（右圖為整流效率）。', 15)
            else: r.box('實驗三 實測 vs 預報對照圖。填好 measured/lab1-exp3-halfwave.csv 後重跑本腳本會自動帶入')
            r.h3('進階實驗 II：全波橋式整流器', OPT); r.todo('有做才寫；沒做請刪除本小節。只接受「基礎」「基礎＋進階 I」「基礎＋進階 I＋進階 II」三種組合。')

        # 五、實驗結果分析
        r.page_break()
        r.h1('實驗結果分析')
        r.h2('導通電壓：同一準則比較三組資料')
        r.draft('指數曲線其實沒有一個數學上的轉折點，這點我在算之前就很在意，所以先定好「導通」怎麼讀，再對實測、Tinkercad、LTspice 各讀一次，才比得公平。我用兩個讀法：準則一是取電流到 1 mA 時的 $V_D$（相鄰兩列線性內插）；準則二是把電流大於最大值一半的那些點做最小平方直線，外推到 $I = 0$ 的截距，也就是一般說的切線交點。')
        r.table(['資料', '準則一：$I = 1\\ \\text{mA}$ 的 $V_D$', '準則二：切線交點', '陡段動態電阻', '最大電流'],
                [['課本定電壓模型', '0.7 V（約 10 mA 量級）', '—', '0 Ω', '1.30 mA'], ['LTspice 1N4007', '0.588 V', '0.551 V', '36 Ω', '1.40 mA'],
                 ['Tinkercad', '0.535 V', '0.510 V', '24 Ω', '1.46 mA'], ['實測'] + (meas if meas else [None] * 4)], caption='導通電壓比較：同一準則下的課本模型、LTspice、Tinkercad 與實測')
        if v_meas and v_lt:
            r.draft(f'實測用準則一（$I = 1\\ \\text{{mA}}$）讀到的導通電壓是 {v_meas:.3f} V，比 LTspice 1N4007 的 {v_lt:.3f} V 低 {(v_lt - v_meas) * 1000:.0f} mV（{(v_meas - v_lt) / v_lt * 100:+.1f}%），比課本的 0.7 V 低 {(0.7 - v_meas) * 1000:.0f} mV（{(v_meas - 0.7) / 0.7 * 100:+.1f}%）；準則二的切線交點 {knee["forward"][1]} 也在 LTspice 的 {knee["LTspice 1N4007"][1]} 附近。跟 0.7 V 差這麼多一開始讓我有點疑惑，後來想到我們最大電流只有 {knee["forward"][3]}，離「0.7 V」講的 10 mA 差了快十倍，照二極體方程式每十倍電流差 $nV_T\\ln 10\\approx 83\\ \\text{{mV}}$，算起來剛好對得上。跟 LTspice 差的 1–2% 我猜是這顆元件的 $I_S$、$n$ 跟模型的典型值不一樣、室溫也不一樣，再加上 $V_D$ 最後一位數（±1 mV）的讀值誤差。陡段動態電阻 {knee["forward"][2]} 比 LTspice 的 {knee["LTspice 1N4007"][2]} 大，可能是麵包板彈片和接觸電阻的關係。助教課堂上也提到 0.7 V 只是常用的近似值，量到 0.5–0.8 V 都可能合理，會隨元件、電流和溫度變。')
        r.h2('逆向漏電流：量到的是二極體還是電壓表')
        r.draft('寫這段是因為我做之前有個擔心：GDM-532 電壓檔的輸入阻抗大約 10 MΩ，如果電壓表一直跨在二極體兩端，它自己就是一條並聯的路，20 V 時會分走 $\\frac{20\\ \\text{V}}{10\\ \\text{M}\\Omega}=2\\ \\mu\\text{A}$。這比 1N4007 真正的漏電流（LTspice 在 20 V 時算出 0.11 nA）大了四個數量級，而且這股電流會跟著流過串聯的電流表，很容易被當成是二極體在漏。')
        r.table(['量', '規格書', 'LTspice 1N4007', 'Tinkercad', '實測'],
                [['逆偏 20 V 的電流', '≤ 5 µA（1000 V、25 °C）', f'{at(vs2, i2, 20):.2f} nA', '0', (f'≤ {i20} µA（$V_R$ 讀 0.1 mV，解析度上界）' if i20 else None)], ['電壓表 10 MΩ 分走的電流（20 V）', '2 µA', '不在模型內', '0（理想電表）', '量 $V_R$ 時電壓表不在二極體上，不適用'],
                 ['等效電阻 $\\frac{V_D}{I}$（20 V）', '—', '$1.8\\times10^{11}\\ \\Omega$', '∞', (f'≥ {req20}' if req20 else None)], ['$V_R = V_s - V_D$（20 V）', '≈ 0', '0.1 µV', '0', (f'{vr20} V（面板與電表校正差）' if vr20 else None)]], caption='逆偏量測比較')
        r.draft('不過這次只有一台電表，$V_D$ 和 $V_R$ 是分兩次量的，量 $V_R$ 時電壓表沒有跨在二極體上，所以剛好躲掉這個問題。那我量到的是什麼？1 kΩ 上的電壓從 1 V 到 20 V 都只讀到 0.1 到 0.2 mV，已經是 mV 檔的最後一位數，換算出來的 0.1 到 0.2 µA 只能當上界，真正的漏電流在這之下，而且看起來跟電壓沒什麼關係。這跟規格書 5 µA 的上限不衝突，只是我們的電表分不到 LTspice 那種 0.1 nA 的等級。所以曲線整條貼著橫軸；至於崩潰，1N4007 的 1000 V 遠超過 GPE-3323 最高的 32 V，實驗裡本來就看不到。')
        if adv:
            r.h2('半波整流：峰值、效率與漣波')
            r.draft('**輸出峰值少掉多少。** 比較 $V_{in,peak}$ 與 $V_{out,peak}$，差值應該接近一個二極體壓降，但不會剛好是 0.7 V。半波整流的峰值電流只有約 $\\frac{5-0.6}{10\\ \\text{k}\\Omega}\\approx 0.44\\ \\text{mA}$，比實驗一掃到的最大電流（約 1.4 mA）還小，而由二極體方程式每十倍電流才差 $nV_T\\ln 10\\approx 83\\ \\text{mV}$，所以電流越小壓降越低——LTspice 在這個條件下給 0.56 V。這就是常數電壓模型的適用範圍問題：0.7 V 是 10 mA 量級的說法，拿到 0.4 mA 上會高估。')
            r.draft('**效率差在哪。** 理想上限 $\\frac{4}{\\pi^2} = 40.6\\%$ 的推導見「實驗原理」，它和 $V_{p}$、R、f 都無關。實測一定更低，主因是二極體壓降先讓輸出峰值少一塊（4.44 V 而非 5 V），其次是示波器讀值的取樣與量化誤差；LTspice 算出 38.2%。不要把差異寫成「儀器誤差」就結束。')
            r.draft('**漣波為什麼這麼大。** $R_{L}$C = 10 ms、一個週期 1/f = 16.7 ms，電容撐不過一次空檔，所以看到的是深鋸齒而不是平穩直流。把 $V_R \\approx \\frac{V_p}{R_L C f}$ 反解，要讓漣波降到峰值的 5–10%（即 $V_R \\approx 0.22$–$0.44\\ \\text{V}$）需要 $C \\approx 16$–$33\\ \\mu\\text{F}$；LTspice 掃 10 µF 得 0.61 V、100 µF 得 0.07 V，和這個估計一致。這也說明為什麼線性近似在 1 µF 算出比峰值還大的 7.2 V：前提「電容只放掉一小部分」在這組參數下根本不成立。')
            r.table(['區段', '量', '理想公式', 'LTspice 1N4007', '實測', '誤差 vs LTspice'],
                    [[lbl(x['區段'].replace('V_out ', '')), lbl(x['量測項目']),
                      (pct(x['理想公式']) if '效率' in x['量測項目'] else x['理想公式']) or '—',
                      (pct(x['預報_LTspice']) if '效率' in x['量測項目'] else x['預報_LTspice']) or '—',
                      (pct(x['實測']) if '效率' in x['量測項目'] else (x['實測'] or None)) or None,
                      err(x['實測'], x['預報_LTspice'])] for x in m3],
                    caption='實驗三逐項對照：理想公式、LTspice 與實測')
            r.todo('把上表的實測欄填完，並依序回答四件事：(1) 輸出峰值少掉多少、為什麼不是剛好 0.7 V；(2) 量到的效率和 40.6% 差多少、差在哪；(3) 加電容前後輸出差在哪，用 RC 與週期的比值解釋，並算出要讓漣波降到峰值 5–10% 需要多大的電容；(4) 實測與 LTspice 逐項比，差異超過一成要指出是哪一項先偏掉的。')
        r.h2('講義問題')
        qs = [('實驗一 Q1：由 I-V 曲線估計的導通電壓為何？與理論值比較並解釋差異。', '引用上表；重點是導通電壓定義在某個電流上。', f'我用兩種方式讀：以電流到 1 mA 那一點當基準是 {v_meas:.3f} V，把陡的那一段畫一條直線外推到電流為零是 {knee["forward"][1] if meas else "—"}。兩個都比課本的 0.7 V 低，差了快 {(0.7 - v_meas) * 1000:.0f} mV，一開始還以為是哪裡接錯了。後來回去算了一下才發現，0.7 V 講的是電流在 10 mA 左右的情況，我們這個電路最多只到 1.4 mA，差了快十倍。照二極體方程式，電流每差十倍 $V_D$ 大概差 83 mV，所以讀到 0.58 V 其實是合理的。LTspice 用 1N4007 的模型跑、用同一個基準讀也是 {v_lt:.3f} V，跟我的只差幾 mV。所以我覺得數據沒問題，差的是「導通」要看在哪個電流來定義。' if v_meas and v_lt else ''),
              ('實驗一 Q2：為何低於導通電壓時電流幾乎為零、超過後指數上升？', '空乏區變窄、位障降低 → 能跨過位障的多數載子數依 $\\exp\\left(\\frac{V_D}{nV_T}\\right)$ 增加。', '還沒到導通電壓的時候，外加電壓只是把空乏區的位障稍微壓低一點，絕大多數載子還是過不去，電流只有 $I_S$ 那個量級，電表上看起來就是 0。電壓再往上加，能翻過位障的載子數是照 $\\exp\\left(\\frac{V_D}{nV_T}\\right)$ 長的，$V_D$ 每多 83 mV 電流就多十倍，所以曲線看起來像到了某一點突然往上衝。其實它一直都是指數，只是前面的值太小看不出來。我自己的數據也是這樣：$V_s$ 從 0.5 V 調到 0.6 V，$V_D$ 只從 0.473 V 變到 0.481 V，電流卻從 0.028 mA 跳到 0.121 mA，變了四倍多。'),
              ('實驗一 Q3：限流電阻的角色？拿掉會怎樣？', '導通後動態電阻僅數十 Ω，電流只受電源限制 → 二極體過熱或電源進入 CC 保護。', '限流電阻是用來保護二極體跟電源的。二極體一旦導通，自己的動態電阻只剩幾十歐姆，如果電源直接接在二極體上，電壓只要比導通電壓多一點點電流就會大到失控，二極體很可能燒掉，不然就是電源跳到定電流保護。串了 1 kΩ 之後，超過導通電壓的部分都落在電阻上，電流最大也就 $\\frac{2-0.6}{1\\ \\text{k}\\Omega}\\approx 1.4\\ \\text{mA}$，很安全。另外這次只有一台電表，電流其實是量 $V_R$ 再除以電阻算出來的，所以這顆電阻同時也當了我的電流表。'),
              ('實驗二 Q1：由曲線估計的崩潰電壓？與規格書比較。', '量不到：$V_{BR} = 1000\\ \\text{V}$，GPE-3323 最高 32 V；本實驗的逆偏曲線全程貼著橫軸。', '老實說量不到。1N4007 規格書寫的崩潰電壓是 1000 V，實驗室的電源供應器 GPE-3323 一組最多只能輸出 32 V，講義也只要我們掃到 20 V。我掃到 20 V 的時候電阻上的壓降還是只有 0.1 mV 左右，電流算出來大概 0.1 µA，而且從 1 V 到 20 V 幾乎都是這個值，I-V 曲線整條貼在橫軸上，完全看不出要往下彎的跡象。所以這題我沒辦法從自己的曲線估，只能寫規格書的 1000 V。'),
              ('實驗二 Q2：崩潰現象；突崩與齊納機制的差別；為何一般二極體不宜操作在此區。', '齊納：強電場穿隧、重摻雜低電壓；突崩：碰撞游離連鎖倍增、高電壓；一般二極體未設計散熱與均勻崩潰，超過電流即永久損壞。', '崩潰就是逆向電壓加到某個值之後，原本幾乎不通的二極體突然大量導電，電流一下子衝上去。我查到的兩種機制是：齊納崩潰發生在重摻雜、空乏區很薄的二極體，電場強到可以直接把電子從價帶拉到導帶，通常在幾伏特以內；突崩崩潰則是摻雜比較輕、空乏區比較寬的二極體，少數載子在強電場裡被加速，撞到晶格把更多電子電洞對撞出來，新的載子又被加速再去撞別人，像連鎖反應一樣，所以需要的電壓比較高。1N4007 這種 1000 V 的屬於後者。一般整流二極體不該操作在崩潰區，是因為它沒有為這個狀況設計：崩潰後電流幾乎不受電壓控制，功率全集中在接面上，熱散不掉就會永久壞掉。齊納二極體是特別做成可以反覆在崩潰電壓工作的，所以能拿來穩壓，一般二極體不行。'),
              ('實驗二 Q3：齊納穩壓電路中串聯電阻的角色？拿掉的後果？', '崩潰後 $r_d$ 只有數 Ω，串聯電阻決定崩潰電流並吸收輸入與 $V_Z$ 的差；拿掉則電流失控燒毀。', '這題其實跟實驗一 Q3 是同一個道理。齊納二極體崩潰之後電壓幾乎就固定在 $V_Z$，動態電阻只有幾歐姆，輸入電壓比 $V_Z$ 多出來的部分一定要有地方落，那個地方就是串聯電阻，流過齊納的電流也是它決定的。拿掉的話，輸入只要比 $V_Z$ 高一點，電流就會照那幾歐姆暴衝，齊納二極體會燒掉，穩壓也就談不上了。')]
        for q, hint, ans in qs:
            r.h4(q)
            if a.final: r.para(ans)
            else: r.draft(f'要點：{hint}'); r.todo('用自己的話回答，能引用自己的數據更好。')

        # 六、程式模擬分析
        r.page_break()
        r.h1('程式模擬分析', OPT)
        r.h2('LTspice：真實 1N4007 模型')
        r.para('LTspice 我用的是內建元件庫裡 Diodes Inc. 的 1N4007 參數（$I_S = 90\\ \\text{pA}$、$n = 1.4$、$R_S = 40\\ \\text{m}\\Omega$、$BV = 1000\\ \\text{V}$），.model 直接寫在網表裡，網表如下。實驗一用 .dc 把 $V_{s}$ 從 0 掃到 2 V；實驗二把二極體反接掃 0 到 20 V，另外多掃一次到 1200 V，想看看崩潰長什麼樣子' + ('；實驗三改用 .tran 暫態分析，並以 .step param 掃三種電容值。' if adv else '。'))
        r.code(open(os.path.join(LAB, 'lab1-exp1-forward.cir'), encoding='utf-8').read())
        r.figure(os.path.join(IMG, 'ec-week3-ltspice', 'exp1-forward-iv.png'), 'LTspice 實驗一：左為 $I_{D}$–$V_{D}$，$I = 1\\ \\text{mA}$ 時 $V_D = 0.59\\ \\text{V}$；右為 $V_{D}$、$V_{R}$ 對 $V_{s}$，導通後多出來的電壓落在電阻上。', 15)
        r.code(open(os.path.join(LAB, 'lab1-exp2-reverse.cir'), encoding='utf-8').read())
        r.figure(os.path.join(IMG, 'ec-week3-ltspice', 'exp2-reverse-iv.png'), 'LTspice 實驗二：20 V 內漏電流約 0.1 nA；掃到 1200 V 才在 1000 V 崩潰，實驗室電源無法到達。', 15)
        pick = (0.5, 0.7, 1.0, 1.5, 2.0); tk = {x['Vs']: x for x in t1}; mm = {x['Vs']: x for x in m1}
        r.table(['$V_{s}$ (V)', 'LTspice $V_{D}$ (V)', 'LTspice I (mA)', 'Tinkercad $V_{D}$ (V)', 'Tinkercad I (mA)', '實測 $V_{D}$ (V)', '實測 I (mA)'],
                [[f'{v:.1f}', f'{at(vs1, vd1, v):.3f}', f'{at(vs1, i1, v):.3f}', tk[f'{v:.1f}']['VD'], tk[f'{v:.1f}']['I_mA'], f(mm[f'{v:.1f}'].get('VD')), f(mm[f'{v:.1f}'].get('I_mA'))] for v in pick],
                caption='實驗一：LTspice、Tinkercad 與實測對照')
        r.figure(os.path.join(IMG, 'ec-week3-measured', 'exp1-forward-overlay.png'), 'Tinkercad 掃描點疊在 LTspice 曲線上：通用二極體模型比 1N4007 早導通約 0.05 V。', 15)
        r.para('把 LTspice 跟實測放在一起看：0.6 V 以上那段兩者幾乎疊在一起，實測 $V_D$ 比 LTspice 低 1 到 4%，電流差不多。反而是 0.5 V 以下實測電流比模擬大，例如 0.3 V 時實測 0.024 mA、LTspice 只有 0.0004 mA。我猜是這段電流太小，$V_R$ 只有零點幾 mV，已經在電表解析度的邊緣，讀值本身就不準，不是二極體真的漏那麼多。整體來說模型的 $I_S$、$n$ 是典型值，每顆元件跟當天的溫度都不一樣，差個幾 % 應該算正常。') if a.final else r.todo('比較 LTspice 與實測：哪一段吻合、哪一段偏離，可能原因（模型的 $I_S$、$n$ 是典型值，個別元件與溫度不同）。')
        if adv:
            r.h4('實驗三：半波整流的暫態分析與電容掃描')
            r.para('輸入改成 SINE(0 5 60)，先跑無電容的 50 ms 看波形，再用 .step param 掃 $C = 1\\ \\mu\\text{F}$／$10\\ \\mu\\text{F}$／$100\\ \\mu\\text{F}$ 並跑到 3 s 讓濾波電容進入穩態（濾波電容大時只跑 50 ms 還沒到穩態，漣波會算錯）。峰值、rms、平均與漣波都取穩態最後兩個週期、以時間加權計算。')
            r.code(open(os.path.join(LAB, 'lab1-exp3-halfwave-rc.cir'), encoding='utf-8').read())
            r.figure(os.path.join(IMG, 'ec-week3-ltspice', 'exp3-halfwave.png'), 'LTspice 實驗三（無電容）：$V_{in}$ 為 ±5 V 正弦，$V_{out}$ 只剩正半週，峰值 4.44 V，比輸入低一個二極體壓降 0.56 V。', 15)
            r.figure(os.path.join(IMG, 'ec-week3-ltspice', 'exp3-halfwave-rc.png'), 'LTspice 實驗三（電容掃描）：同一個電路，C 從 1 µF 加到 100 µF，漣波從 3.22 V 降到 0.07 V。', 15)
            r.table(['C', '$V_{peak}$ (V)', '谷底 (V)', '漣波 $V_{R}$ (V)', '$R_{L}$C', '線性近似 $\\frac{V_p}{R_L C f}$'],
                    [['無 C', '4.442', '0.000', '4.442（整個半週）', '—', '—'],
                     ['1 µF', '4.440', '1.218', '3.222', '10 ms', '7.2 V（近似失效）'],
                     ['10 µF', '4.411', '3.803', '0.608', '100 ms', '0.72 V'],
                     ['100 µF', '4.347', '4.281', '0.066', '1 s', '0.072 V']],
                    caption='LTspice 電容掃描：$R_{L}$C 明顯大於週期 16.7 ms 之後，線性近似才開始可用', todo_blank=False)
            r.todo('把實測的兩組波形（無電容、1 µF）和上面兩張 LTspice 圖並排比較，指出峰值、谷底、漣波三者哪一項先偏離，以及可能原因（電容實際容量的誤差通常有 ±10–20%、示波器探棒的 10 MΩ 也會參與放電）。')
        r.h2('KiCad：電路圖與 ERC')
        r.para(('三張' if adv else '兩張') + '量測電路圖是我用 KiCad 10 畫的（放在「實驗原理」那一節），電氣規則檢查（ERC）沒有違規。從原理圖匯出的 SPICE 網表跟我手寫的 LTspice 網表拓樸一樣（實驗一、二都是 V1 → D1 → R1 → 當電流表用的 0 V 電壓源 → GND' + ('，實驗三為 Vin → D1 → R1 ∥ C1 → GND）。' if adv else '）。') + '圖左下角那一行「.dc V1 …」是 ngspice 的掃描指令：二極體符號帶著同一組 1N4007 模型參數，所以同一張原理圖在 KiCad 內建的模擬器也可以直接跑出 I-V 曲線，和 LTspice 的結果互相核對；本結報的預報值仍取自 LTspice。')
        return r

    # 第一段：先組一次、轉 PDF 找出每個章節在第幾頁，第二段再帶著目錄重組（目錄本身佔一頁，頁碼 +1）
    r = build(None)
    os.makedirs(BUILD, exist_ok=True)
    tmp = os.path.join(BUILD, 'pass1.docx'); r.save(tmp, True)
    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', BUILD, tmp], check=True, capture_output=True)
    pdf = os.path.join(BUILD, 'pass1.pdf')
    npages = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout).group(1))
    pages = [re.sub(r'\s+', '', subprocess.run(['pdftotext', '-f', str(i), '-l', str(i), pdf, '-'], capture_output=True, text=True).stdout) for i in range(1, npages + 1)]
    entries = []; cursor = 0
    for level, text in r.headings:
        key = re.sub(r'\s+', '', text)
        hit = next((i for i in range(cursor, npages) if key in pages[i]), None)
        if hit is None: print(f'目錄：找不到「{text}」的頁碼，先填 —', file=sys.stderr); entries.append((level, text, '—')); continue
        cursor = hit; entries.append((level, text, hit + 2))   # pdf 第 i 頁（0 起算）= 第 i+1 頁，再加目錄那一頁
    print('目錄：'); [print(f'  {"  " * (lv - 1)}{t} ... {pg}') for lv, t, pg in entries]
    r = build(entries)
    r.save(out, a.force)


if __name__ == '__main__':
    main()
