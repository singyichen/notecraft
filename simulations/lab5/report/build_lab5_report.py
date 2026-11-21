#!/usr/bin/env python3
"""Lab 5（加法器與減法器）結報：三個實驗全做完，對應助教範本的基礎實驗、進階實驗 I、進階實驗 II。

數據全部來自 11/21 當天的示波器讀值（統計表「當前」欄），和當天上傳 E3 的
「515661055_陳欣怡_Lab 5 實驗數據結果」同一份，數字原樣不動。

當天的實際接法和課前規劃不同：桌上沒有訊號產生器，V_in1 用示波器 EDUX1052G 的 Gen Out
（100 Hz 正弦波），V_in2 直接接 GPE-3323 CH3 的固定 +5 V 直流。理論值依各電路的關係式
逐點計算，LTspice 也用同一組條件重跑（lab5-meas-exp{1,2,3}.cir）。

版面照助教的 Lab_結報形式參考.pdf（章節標題連「（必要）」「（選繳）」都照抄），
正文照 .claude/skills/lab-workflow/references/report-voice.md 的學生口吻契約，
長度目標 12 頁以內。

用法：cd simulations/lab5 && ../lab1/.venv/bin/python report/build_lab5_report.py --id 515661055 --name 陳欣怡
"""
import argparse
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.abspath(os.path.join(HERE, '..'))
ROOT = os.path.abspath(os.path.join(LAB, '..', '..'))
sys.path.insert(0, os.path.join(LAB, '..', 'tools'))

from lab_report import Report, REQ, OPT, GREY, add_runs                  # noqa: E402
from docx.enum.table import WD_TABLE_ALIGNMENT                           # noqa: E402
from docx.enum.text import WD_ALIGN_PARAGRAPH                            # noqa: E402
from docx.shared import Cm, Pt                                           # noqa: E402

IMG = os.path.join(ROOT, 'public', 'note-images')
MEAS = os.path.join(IMG, 'ec-week11-measured')
TINK = os.path.join(IMG, 'ec-week11-tinkercad')
LTS = os.path.join(IMG, 'ec-week11-ltspice')
OUT_DIR = os.path.join(ROOT, 'src', 'content', 'notes', '_outputs', 'lab5')

VIN2 = 5.0          # GPE-3323 CH3 的固定 +5 V

# 11/21 示波器統計表「當前」欄的讀值。vin1／vout 都寫成 (V_in1 在波谷時, V_in1 在波峰時)。
EXPS = {
    1: dict(zh='反相加法器', en='Inverting Summing Amplifier',
            vin1=(-2.17, 2.17), vout=(-2.65, -6.75), theory=lambda v: -(v + VIN2),
            phase='反相', scope='lab5-exp1-scope.jpg', board='lab5-exp1-breadboard-photo.jpg'),
    2: dict(zh='同相加法器', en='Summing Amplifier',
            vin1=(-2.15, 2.11), vout=(2.87, 7.21), theory=lambda v: v + VIN2,
            phase='同相', scope='lab5-exp2-scope.jpg', board='lab5-exp2-breadboard-photo.jpg'),
    3: dict(zh='減法器', en='Subtracting Amplifier',
            vin1=(-5.4, 5.2), vout=(-10.3, 0.2), theory=lambda v: v - VIN2,
            phase='同相', scope='lab5-exp3-scope.jpg', board='lab5-exp3-breadboard-photo.jpg'),
}

# LTspice 用同一組條件跑出來的輸出（lab5-meas-exp*.cir，最後兩個週期）
LT = {1: (-2.829, -7.169), 2: (2.850, 7.110), 3: (-10.400, 0.200)}


def g(n, key):
    return EXPS[n][key]


def th_pair(n):
    f = g(n, 'theory')
    lo, hi = g(n, 'vin1')
    return f(lo), f(hi)


def mid(pair):
    return (pair[0] + pair[1]) / 2


def span(pair):
    return abs(pair[1] - pair[0])


def photo_row(r, items, width_cm=7.6):
    """一列並排放照片（無框線表格），items 是 (完整路徑, 圖說)。"""
    t = r.doc.add_table(rows=1, cols=len(items))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for cell, (path, cap) in zip(t.rows[0].cells, items):
        cell.width = Cm(width_cm + 0.4)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        if os.path.exists(path):
            p.add_run().add_picture(path, width=Cm(width_cm))
        else:
            add_runs(p, f'[找不到 {os.path.basename(path)}]', size=9)
        r._fig += 1
        c = cell.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c.paragraph_format.space_after = Pt(6)
        add_runs(c, f'圖 {r._fig}　{cap}', size=8.5, color=GREY)


def compare_table(r, n, caption):
    th, ms = th_pair(n), g(n, 'vout')
    rows = [
        ['$V_{in1}$ 在波谷時的輸出', f'{th[0]:+.2f} V', f'{ms[0]:+.2f} V', f'{ms[0] / th[0]:.3f}'],
        ['$V_{in1}$ 在波峰時的輸出', f'{th[1]:+.2f} V', f'{ms[1]:+.2f} V', f'{ms[1] / th[1]:.3f}'],
        ['輸出的交流峰對峰', f'{span(th):.2f} V', f'{span(ms):.2f} V', f'{span(ms) / span(th):.3f}'],
        ['輸出的直流中心', f'{mid(th):+.2f} V', f'{mid(ms):+.2f} V', f'{mid(ms) / mid(th):.3f}'],
    ]
    r.table(['項目', '理論計算', '實測', '實測 ÷ 理論'], rows, caption=caption,
            col_widths=[5.6, 3.3, 3.3, 3.3])


def build(sid, name, out, force):
    r = Report(5, '加法器與減法器', name=name, student_id=sid, final=False)

    # ── 一、實驗目的 ────────────────────────────────────────────────────────
    r.h1('實驗目的', REQ)
    r.para('這次要做的是運算放大器（operational amplifier）的三種多輸入接法，用的都是同一顆 uA741 和'
           '清一色 10 kΩ 的電阻。講義原本要兩路都送正弦波，但當天桌上只有示波器和電源供應器，'
           '沒有訊號產生器，示波器內建的 Gen Out 又只有一組輸出。所以我把第二路改接電源供應器 CH3 的'
           '固定 $+5$ V 直流，變成一路交流、一路直流。這件事後來反而成了整份報告最好用的地方。')

    r.h2('基礎實驗 - 目的: 反相加法器（Inverting Summing Amplifier）')
    r.bullets([
        '兩路訊號各經一顆 10 kΩ 進運放的「−」端，回授也是 10 kΩ，「＋」端接地，看輸出是不是真的等於'
        '兩路相加再反號。',
        '$V_{in1}$ 是 Gen Out 的 100 Hz 正弦波、$V_{in2}$ 是 $+5$ V 直流，所以輸出應該是一條反相的'
        '正弦波整條沉到負的位置。',
    ])
    r.h2('進階實驗 I - 目的: 同相加法器（Summing Amplifier）')
    r.bullets([
        '元件完全一樣，只是兩路改從「＋」端進去，「−」端換成一顆對地、一顆回授。輸出應該變成同相，'
        '而且一樣是相加。',
        '順便看兩路會不會互相影響。這個電路沒有虛接地把兩路隔開。',
    ])
    r.h2('進階實驗 II - 目的: 減法器（Subtracting Amplifier）')
    r.bullets([
        '和同相加法器同一塊板，只把「接地」和「吃訊號」那兩條線對調：$V_{in1}$ 走「＋」端、'
        '$V_{in2}$ 走「−」端，輸出變成相減。',
        '因為 $V_{in2}$ 是固定的 5 V，理論上輸出就是把 $V_{in1}$ 整條往下搬 5 V，波形和相位都不會變。'
        '這組是三個裡面最好對照的。',
    ])

    # ── 二、實驗原理 ────────────────────────────────────────────────────────
    r.h1('實驗原理', REQ)

    r.h2('基礎實驗 - 原理: 反相加法器')
    r.para('我自己是把「−」端那個節點想成被運放釘死的一點。運放會拚命讓兩個輸入端的電壓一樣，'
           '「＋」端接地是 0 V，所以「−」端也會被拉到 0 V，可是它並沒有真的接地，所以叫虛接地'
           '（virtual ground）。釘死之後每一路的電流就只看自己那一顆電阻，跟另一路完全無關。')
    r.para('運放的輸入端不吃電流，兩股電流進了那一點只能一起從回授電阻走掉：')
    r.equation(r'\frac{V_{in1}}{R_1}+\frac{V_{in2}}{R_2}=-\frac{V_{out}}{R_3}'
               r'\;\Longrightarrow\;'
               r'V_{out}=-\left(\frac{R_3}{R_1}V_{in1}+\frac{R_3}{R_2}V_{in2}\right)')
    r.para('三顆都是 10 kΩ，權重就都等於 1，化簡成 $V_{out}=-(V_{in1}+V_{in2})$。對這次實驗來說，'
           '$V_{in2}$ 是固定的 $+5$ V，所以輸出的直流中心應該落在 $-5$ V、波形和 $V_{in1}$ 反相。'
           '照我設的振幅算，進實驗室前就可以先預期波峰在 $-2.83$ V、波谷在 $-7.17$ V。')

    r.h2('進階實驗 I - 原理: 同相加法器')
    r.para('這個的順序是反過來的：訊號先在「＋」端被兩顆電阻分壓成平均值，再被「−」端那組電阻放大回來。')
    r.equation(r'V_{+}=\frac{V_{in1}+V_{in2}}{2}\,,\qquad'
               r'V_{out}=V_{+}\left(1+\frac{R_3}{R_4}\right)=2V_{+}=V_{in1}+V_{in2}')
    r.para('分壓先除以 2、放大再乘回 2，兩個動作剛好抵消，所以結果一樣是相加，只是不反號。'
           '它和反相加法器最大的差別是兩路會互相負載。兩顆輸入電阻直接串在兩個訊號源之間，'
           '一路動，另一路看到的電位就會跟著變，沒有虛接地那面牆。這也表示腳 3 的電位永遠是輸出的一半，'
           '是這個電路最容易驗證的中間量，可惜我當天沒量到。')

    r.h2('進階實驗 II - 原理: 減法器')
    r.para('兩路各走一邊，用重疊定理（superposition）拆開算比較快。先把 $V_{in1}$ 接地只看 $V_{in2}$，'
           '剩下一個標準的反相放大器，輸出是 $-\\frac{R_4}{R_3}V_{in2}$；再把 $V_{in2}$ 接地只看 '
           '$V_{in1}$，它先被 $R_1$、$R_2$ 分壓成一半送進「＋」端，再被 $1+\\frac{R_4}{R_3}=2$ 放大：')
    r.equation(r'V_{out}=\frac{R_2}{R_1+R_2}\left(1+\frac{R_4}{R_3}\right)V_{in1}'
               r'-\frac{R_4}{R_3}V_{in2}=V_{in1}-V_{in2}')
    r.para('四顆電阻一樣大的時候兩個係數剛好都是 1。這次 $V_{in2}$ 是 5 V 直流，所以理論上輸出就是'
           '$V_{in1}$ 原封不動往下搬 5 V，振幅不變、相位不變，只有位置變。'
           '我預期波峰在 $+0.20$ V、波谷在 $-10.40$ V。')

    # ── 三、Tinkercad 模擬 ─────────────────────────────────────────────────
    r.h1('Tinkercad 模擬', REQ)
    r.para('進實驗室前先在 Tinkercad 把三個電路各搭一次，目的只有一個：確認接法。'
           '那時候還以為兩路都要送正弦波，所以每張圖上都放了兩台函數波產生器（Tinkercad 一台只有一組輸出）。'
           '當天第二路改成直流，但電阻和運放的位置一格都沒變，接法照搬就能用。')
    photo_row(r, [
        (os.path.join(TINK, 'lab5-exp1-tinkercad.png'),
         '反相加法器：兩顆輸入電阻都落在腳 2 那一欄，所以一顆走上半部、一顆走下半部'),
        (os.path.join(TINK, 'lab5-exp2-tinkercad.png'),
         '同相加法器：兩路改接到腳 3，腳 2 那邊換成一顆對地、一顆回授'),
    ], width_cm=7.4)
    photo_row(r, [
        (os.path.join(TINK, 'lab5-exp3-tinkercad.png'),
         '減法器：和同相加法器同一塊板，只把接地與吃訊號那兩條線對調'),
        (os.path.join(TINK, 'lab5-exp1-schematic.png'),
         '切到線路圖檢視，兩顆輸入電阻接到同一個節點看得最清楚'),
    ], width_cm=7.4)
    r.para('Tinkercad 這邊只拿來確認接法，數值我沒有抄。它的運放是理想模型、示波器也只有一個通道，'
           '兩台產生器各自觸發，連相位都看不出來。要對數字我是用 LTspice（見第六節）。')

    # ── 四、實驗數據與結果 ──────────────────────────────────────────────────
    r.page_break()
    r.h1('實驗數據與結果', REQ)
    r.para('儀器：GW Instek GPE-3323 直流電源供應器（CH1／CH2 按 Series 串聯追蹤做出 $\\pm 15$ V，'
           'CH3 的固定 $+5$ V 當 $V_{in2}$）、Keysight EDUX1052G 數位示波器（前面板 Gen Out 當訊號源，'
           'CH1 夾 $V_{in1}$、CH2 夾腳 6 的 $V_{out}$，兩個通道都是直流耦合）、GW Instek GDM-532 三用電表。'
           '元件是 uA741 和 10 kΩ 金屬皮膜電阻，基礎實驗用 3 顆、兩個進階實驗用 4 顆，電表量到的都是 10 kΩ。')

    r.h2('麵包版電路', REQ)
    photo_row(r, [
        (os.path.join(MEAS, 'lab5-exp1-breadboard-photo.jpg'), '基礎實驗：反相加法器，三顆 10 kΩ'),
        (os.path.join(MEAS, 'lab5-exp2-breadboard-photo.jpg'), '進階實驗 I：同相加法器，加到四顆'),
    ], width_cm=7.4)
    photo_row(r, [
        (os.path.join(MEAS, 'lab5-exp3-breadboard-photo.jpg'),
         '進階實驗 II：減法器。和上一張同一塊板、同一組電阻，只對調了兩條線，所以做完同相加法器沒有拆板'),
    ], width_cm=10.0)

    r.h2('視波器結果照片／圖片', '（必要：若有使用到視波器）')
    r.para('三張都是黃色 CH1 量 $V_{in1}$、綠色 CH2 量 $V_{out}$。基礎實驗那張我按了停止，'
           '另外兩張是畫面還在跑的時候拍的。')
    photo_row(r, [(os.path.join(MEAS, g(1, 'scope')),
                   '基礎實驗：綠線的峰對著黃線的谷，反相；整條沉在 $-4.70$ V 上')], width_cm=10.5)
    photo_row(r, [
        (os.path.join(MEAS, g(2, 'scope')), '進階實驗 I：綠線被抬到 $+5.04$ V 上，和黃線同相'),
        (os.path.join(MEAS, g(3, 'scope')),
         '進階實驗 II：兩個通道都轉到 5.00 V/div 才放得下，綠線落在 $-5.05$ V 上'),
    ], width_cm=7.4)

    r.h2('實驗數據、表格', REQ)
    r.table(['實驗', 'CH1 $V_{in1}$ 最大', 'CH1 最小', 'CH2 $V_{out}$ 最大', 'CH2 最小'],
            [['基礎 反相加法器', '+2.17 V', '−2.17 V', '−2.65 V', '−6.75 V'],
             ['進階 I 同相加法器', '+2.11 V', '−2.15 V', '+7.21 V', '+2.87 V'],
             ['進階 II 減法器', '+5.2 V', '−5.4 V', '+0.20 V', '−10.30 V']],
            caption='三個實驗的示波器讀值，取自統計表的「當前」欄（$V_{in2}$ 三次都是 CH3 的 +5 V 直流，100 Hz）')

    r.h3('基礎實驗', REQ)
    r.para('$V_{in1}$ 量到 $-2.17$ 到 $+2.17$ V、$V_{in2}$ 是 $+5$ V 直流，'
           '理論輸出 $V_{out}=-(V_{in1}+V_{in2})$ 逐點算是 $-2.83$ 到 $-7.17$ V。')
    compare_table(r, 1, '基礎實驗（反相加法器）的理論與實測')

    r.h3('進階實驗 I', OPT)
    r.para('$V_{in1}$ 量到 $-2.15$ 到 $+2.11$ V，理論輸出 $V_{out}=V_{in1}+V_{in2}$ 是 '
           '$+2.85$ 到 $+7.11$ V。')
    compare_table(r, 2, '進階實驗 I（同相加法器）的理論與實測')

    r.h3('進階實驗 II', OPT)
    r.para('$V_{in1}$ 量到 $-5.4$ 到 $+5.2$ V，理論輸出 $V_{out}=V_{in1}-V_{in2}$ 是 '
           '$-10.40$ 到 $+0.20$ V。')
    compare_table(r, 3, '進階實驗 II（減法器）的理論與實測')

    # ── 五、實驗結果分析 ────────────────────────────────────────────────────
    r.h1('實驗結果分析')

    r.h2('三個電路的加法關係都成立')
    r.para('三組輸出的相位、波形和直流位階都跟手算對得上。最準的是減法器，波峰 $+0.20$ V 一模一樣、'
           '波谷 $-10.30$ V 對 $-10.40$ V，只差 1%。同相加法器高了 1%。'
           '只有基礎實驗那組整條矮了一截：波峰該是 $-2.83$ V 我量到 $-2.65$ V，波谷該是 $-7.17$ V '
           '我量到 $-6.75$ V，兩端都是 6%。')

    r.h2('基礎實驗那 6% 是什麼')
    r.para('老實說拍照的當下沒發現，是回來把波峰波谷跟手算擺在一起才看出來。'
           '第一個念頭是示波器兩個通道的增益差，$V_{in1}$ 和 $V_{out}$ 本來就是用不同通道讀的。'
           '但是做完另外兩組就知道不是：同一台示波器、同樣那兩個通道，進階實驗 I 偏高 1.4%、'
           '進階實驗 II 偏低 1%，連方向都相反。固定的通道誤差不會這樣。')
    r.para('真正有用的線索是 $V_{in2}$ 那顆 5 V。三個電路對直流的增益剛好不一樣：反相加法器是 '
           '$-R_3/R_2$、同相加法器是 $+1$、減法器是 $-1$。進階實驗 I 量到輸出的直流中心是 '
           '$+5.04$ V，進階實驗 II 是 $-5.05$ V，兩個不同的電路、符號相反，卻對到 0.2% 以內，'
           '所以 CH3 那顆 5 V 實際上是 5.05 V 上下。把它代回基礎實驗，走 $R_2$ 那條直流路徑的比值是 '
           '$4.70/5.05 = 0.931$。')
    r.para('而走 $R_1$ 的交流路徑，比值是 $4.10/4.34 = 0.945$。兩條路徑完全獨立，一條經 $R_1$、'
           '一條經 $R_2$，卻都低了 6%，而它們共同的分子只有回授電阻 $R_3$。所以我認為是基礎實驗'
           '那塊板上的 $R_3$ 偏小，大概差 6%，不是示波器也不是雜訊。')
    r.para('可惜我沒辦法直接證實。當天記錄表上電阻那一欄我只寫了「10 kΩ」，沒把電表多顯示的位數抄下來，'
           '板子後來也拆了。一個旁證是同學同一個電路量到的兩端比值是 0.993 和 1.010，他那塊板沒有這個'
           '問題；同樣的電路、同一套儀器，差別只在手上那幾顆電阻。下次電阻一定抄到小數點後兩位，'
           '那一欄多寫兩個數字只要三十秒。')

    r.h2('一路交流、一路直流這個接法意外好用')
    r.para('本來覺得沒有訊號產生器是件麻煩事，做完才發現這樣反而看得更清楚。'
           '輸出變成「一條正弦波騎在一個直流位階上」，交流那部分完全來自 $V_{in1}$、'
           '直流那部分完全來自 $V_{in2}$，在同一張畫面上就分得開，不會疊在一起。'
           '講義第 17 頁講的重疊定理，照原本兩路正弦波的做法要關掉一路、再關掉另一路量兩次才看得到，'
           '這樣一次就看完。')
    r.para('三個電路對同一顆 5 V 的反應也一次驗完：反相加法器把它翻成 $-4.70$ V，同相加法器原封傳成 '
           '$+5.04$ V，減法器翻成 $-5.05$ V。上一段用來定位 $R_3$ 的那條線索，就是從這裡來的。')

    r.h2('量測上踩到的三件事')
    r.para('第一，四格讀值要取自同一欄。進階實驗 I 我抄的時候，「最大位準(1)」不小心抄到統計那一欄的 '
           '2.19 V，其他三格是當前欄。兩邊一混，$V_{in1}$ 和 $V_{out}$ 的峰對峰都變成 4.34 V、'
           '誤差剛好 0.0%，看起來完美得不像話。回來比對照片才抓到。')
    r.para('第二，統計欄能不能用要看標準偏差。進階實驗 I 那張 CH1 的標準偏差只有 25.6 mV，'
           '平均欄很乾淨；進階實驗 II 那張是 0.9 到 1.5 V、統計的最大最小跨了 4 V，'
           '那是我在轉垂直檔位的過程被算進去的，所以那一張只能用當前欄。拍統計前應該先按「清除量測」'
           '再讓它跑幾秒。')
    r.para('第三，波形只佔了螢幕的四分之一。4.3 $V_{pp}$ 放在 2.00 V/div 上只有 2.2 格，'
           '進階實驗 II 為了容納輸出那 $-5$ V 的直流還得把檔位放寬到 5.00 V/div，'
           '讀值的位數跟著掉到 0.1 V。用垂直位移把兩條線拉開、再把檔位收緊，讀數可以多一位有效數字。')

    r.h2('相位')
    r.para('三組的相位都和理論一致：基礎實驗反相，兩個進階實驗同相。'
           '不過只有基礎實驗那張我按了停止，另外兩張畫面還在跑就拍了，照片上看起來綠線比黃線晚了幾十度。'
           '那不是電路造成的。uA741 在 100 Hz 幾乎沒有相位移，是手機捲簾式快門的關係，'
           '黃線在螢幕上半、綠線在下半，根本不是同一個時刻掃進來的。'
           '要寫度數就得用示波器內建的 Phase 量測，這次我沒量，所以相位欄只寫同相或反相。')

    # ── 六、程式模擬分析（加分項）──────────────────────────────────────────
    r.h1('程式模擬分析', OPT)
    r.para('為了確認「理論」那一欄不是我自己算錯，我把當天真正用的條件丟回 LTspice 再跑一次：'
           'uA741 的 Boyle 巨集模型、$\\pm 15$ V 電源、$V_{in1}$ 的振幅和偏移照實測填、'
           '$V_{in2}$ 是 5 V 直流、頻率 100 Hz，三個電路各一份網表。')
    r.figure(os.path.join(LTS, 'lab5-meas-compare.png'),
             'LTspice 在當天條件下的輸出（藍實線）與實測波峰波谷（橘虛線）。'
             '兩個進階實驗的橘線幾乎貼在波形上，基礎實驗那組明顯有一段距離',
             width_cm=16.0)
    r.table(['實驗', '手算（波谷／波峰）', 'LTspice（波谷／波峰）', '實測（波谷／波峰）'],
            [[f'{n} {g(n, "zh")}',
              f'{th_pair(n)[0]:+.2f} / {th_pair(n)[1]:+.2f} V',
              f'{LT[n][0]:+.2f} / {LT[n][1]:+.2f} V',
              f'{g(n, "vout")[0]:+.2f} / {g(n, "vout")[1]:+.2f} V'] for n in (1, 2, 3)],
            caption='手算、LTspice 與實測的對照（波谷與波峰指 $V_{in1}$ 在波谷與波峰那一刻的輸出）')
    r.para('LTspice 跟手算差不到 1 mV，所以理論那一欄沒有算錯，誤差也不是來自理想運放的假設。'
           '巨集模型連開迴路增益有限、輸入偏壓電流這些都算進去了，結果還是一樣。'
           '兩個進階實驗的實測也緊貼著模擬。只有基礎實驗離開模擬 6%，而且兩端差一樣多，'
           '這再次支持前面那個判斷：問題出在手上那顆回授電阻，不在電路或模型。')

    # ── 七、心得 ────────────────────────────────────────────────────────────
    r.h1('心得', None)
    r.para('這次最大的收穫其實來自一個限制。沒有訊號產生器、第二路只能接一顆固定的 5 V，'
           '一開始覺得是被迫將就，結果那顆直流變成最好用的量尺。三個電路對它的增益各不相同，'
           '我才有辦法反推出它真正的值，再回頭把基礎實驗那 6% 定位到回授電阻上。'
           '如果兩路都照講義送正弦波，這條線索根本不存在。')
    r.para('另一個教訓比較痛：電阻我只記了「10 kΩ」。整個分析最後都指向 $R_3$ 偏小，'
           '可是我沒有那一筆讀值可以收尾，板子也拆了。還有抄讀值混到兩個欄位那件事，'
           '差一點就交出一份「誤差 0.0%」的漂亮數據。這兩個都不是技術問題，是當下沒有把'
           '「這個數字之後要拿來做什麼」想清楚。')

    out = out or os.path.join(OUT_DIR, f'{sid}_{name}_Lab 5 結報.docx')
    os.makedirs(OUT_DIR, exist_ok=True)
    r.save(out, force=force)
    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf', '--outdir', OUT_DIR, out],
                   check=True, capture_output=True)
    print('wrote', os.path.splitext(out)[0] + '.pdf')
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('-o')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    build(a.id, a.name, a.o, a.force)
