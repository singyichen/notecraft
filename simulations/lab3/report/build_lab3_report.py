#!/usr/bin/env python3
"""Lab 3（MOSFET）結報：第一部分的實驗一（輸出特性曲線）與實驗二（轉移特性曲線與臨界電壓）。

數據直接讀 measured/Lab3-數據記錄.xlsx 的快取值，和當天上傳 E3 的「實驗數據結果」同一份，
數字原樣不動。圖重用 build_lab3_data_results.py 的畫法。

報告裡只放實測，不出現任何模擬數據（Tinkercad 那一節是助教範本的必要項目，只講接法、不引數字）。

版面照助教的 Lab_結報形式參考.pdf（章節標題連「（必要）」「（選繳）」都照抄），
正文照 .claude/skills/lab-workflow/references/report-voice.md 的學生口吻契約，
長度目標 12 頁以內。

用法：cd simulations/lab3 && ../lab1/.venv/bin/python report/build_lab3_report.py --id 515661055 --name 陳欣怡
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.abspath(os.path.join(HERE, '..'))
ROOT = os.path.abspath(os.path.join(LAB, '..', '..'))
sys.path.insert(0, os.path.join(LAB, '..', 'tools'))
sys.path.insert(0, HERE)

from lab_report import Report, REQ, OPT, GREY, add_runs                  # noqa: E402
from docx.shared import Pt                                               # noqa: E402
import build_lab3_data_results as D                                      # noqa: E402

IMG = os.path.join(ROOT, 'public', 'note-images')
BUILD = os.path.join(HERE, 'build')
OUT_DIR = os.path.join(ROOT, 'src', 'content', 'notes', '_outputs', 'lab3')
PHOTO_DIR = os.path.join(OUT_DIR, 'photos')


def f(v, fmt='%.3f'):
    x = D.fnum(v)
    return '' if x is None else fmt % x


def measured_only(rows):
    """丟掉整列都沒量到的掃描點。"""
    return [(x, gr) for x, gr in rows if any(D.fnum(g[0]) is not None for g in gr)]


def small(name):
    """照片縮到 1600px 寬再放進 docx，免得四張原圖撐到十幾 MB。"""
    from PIL import Image
    src = os.path.join(PHOTO_DIR, name)
    dst = os.path.join(BUILD, name.rsplit('.', 1)[0] + '-small.jpg')
    if not os.path.exists(src):
        return dst                       # 找不到原圖就交給 Report.figure 顯示提示框
    if not os.path.exists(dst) or os.path.getmtime(src) > os.path.getmtime(dst):
        im = Image.open(src).convert('RGB')
        if im.width > 1600:
            im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
        im.save(dst, quality=85)
    return dst


def photo_pair(r, left, right, width_cm=7.2):
    """兩張照片並排（無框線表格），照片頁才不會一張佔掉半頁。left/right 是 (檔名, 圖說)。"""
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Cm
    t = r.doc.add_table(rows=1, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for cell, (fname, cap) in zip(t.rows[0].cells, (left, right)):
        cell.width = Cm(width_cm + 0.6)
        path = small(fname)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        if os.path.exists(path):
            p.add_run().add_picture(path, width=Cm(width_cm))
        else:
            add_runs(p, f'[找不到照片 {fname}]', size=9)
        r._fig += 1
        c = cell.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c.paragraph_format.space_after = Pt(4)
        add_runs(c, f'圖 {r._fig}　{cap}', size=8.5, color=GREY)


def build(sid, name, out, force):
    os.makedirs(BUILD, exist_ok=True)
    wb = D.load_workbook(D.XLSX, data_only=True)
    # 記錄簿備到 15 V，當天掃到 10 V 就停了；沒量的列不要印進表格（會變成一整頁待填的黃格）
    e1 = measured_only(D.read_exp1(wb['實驗一 特性曲線']))
    e2 = measured_only(D.read_exp2(wb['實驗二 轉移曲線']))
    r = Report(3, 'MOSFET 偏壓與特性曲線', name=name, student_id=sid, final=False)

    # ── 一、實驗目的 ────────────────────────────────────────────────────────
    r.h1('實驗目的', REQ)
    r.para('這次做的是第一部分裡助教指定必做的兩個。實驗一把 $R_1$ 1 kΩ 串在源極，閘極電源固定在 0、2、4、6 V '
           '四個值，每一組再把汲極電源從 0 V 每次加 0.5 V 掃到 10 V，量 $R_1$ 的壓降換算 $I_D$，看電流'
           '什麼時候還被 $R_1$ 牽著走、什麼時候才換成元件自己說了算。')
    r.para('實驗二把同一顆 2N7000 的源極直接接地，$R_1$ 換成 100 Ω 搬到汲極，汲極電源固定在 1、3、5 V 三組，'
           '改掃閘極電壓 0 到 5 V，目標是找出臨界電壓 $V_{th}$。兩個實驗差的只有那顆電阻接在哪一隻腳，'
           '可是量到的東西完全不一樣，這點我是做完才真的有感覺。')

    # ── 二、實驗原理 ────────────────────────────────────────────────────────
    r.h1('實驗原理', REQ)
    r.para('我自己是把 MOSFET 想成一個被閘極電壓控制的閥門。閘極和通道中間隔著二氧化矽，穩態下不吃電流，'
           '所以整個電路只有汲極到源極這一圈要算。閘極電壓要高過臨界電壓 $V_{th}$，表面才會反轉出通道；'
           '通道在汲極端被夾止之後進入飽和區，電流照平方律走：')
    r.equation(r'I_D = \tfrac{1}{2}\,\mu C_{ox}\,\tfrac{W}{L}\,(V_{GS}-V_{th})^2')
    r.para('對這次實驗的意思是：把 √$I_D$ 對 $V_{GS}$ 畫出來，飽和區那一段會是一條直線，'
           '外插到交 $x$ 軸就是 $V_{th}$。這就是實驗二要做的事。')
    r.para('實驗一的麻煩在 $R_1$ 串在源極。電流一流，源極電位就被抬起來，電源面板上讀到的數字不等於元件'
           '兩端的電壓：')
    r.equation(r'V_{GS}^{\text{元件}} = V_{GS}^{\text{設定}} - I_D R_1,\qquad '
               r'V_{DS}^{\text{元件}} = V_{DS}^{\text{設定}} - I_D R_1')
    r.para('電流越大，元件真正的 $V_{GS}$ 就被壓得越低，這是負回授。所以進實驗室前我就知道曲線會比課本'
           '那張矮一截，只是沒想到最後是矮到只剩幾毫安。')
    r.para('實驗二把源極接地就沒有這個問題，電源設定的 $V_{GS}$ 就是元件的 $V_{GS}$。代價是 $R_1$ 搬到'
           '汲極之後會限流：$V_{GS}$ 一高，整圈電流就被鎖在 $V_{DS}/R_1$ 附近，那一段的高度只跟 $R_1$ 有關、'
           '跟元件沒關係。所以能讀的資訊全在電流抬頭的那一小段。')

    # ── 三、Tinkercad 模擬 ──────────────────────────────────────────────────
    r.h1('Tinkercad 模擬', REQ)
    r.para('進實驗室前先在 Tinkercad 把兩個電路都搭過一次，主要是確認 2N7000 三隻腳的方向跟電表要夾哪裡。'
           'Tinkercad 的 nMOS 腳位預設由左到右是汲極／閘極／源極，和手上這顆的源極／閘極／汲極剛好相反，'
           '要轉 180 度才對得上。先在這裡踩過一次，當天就沒有插反。')
    r.figure(os.path.join(IMG, 'ec-week9-tinkercad', 'lab3-exp1-tinkercad.png'),
             'Tinkercad 實驗一：$R_1$ 1 kΩ 在源極，兩台電源負端共接，電表量 $R_1$ 的壓降。', 9)
    r.figure(os.path.join(IMG, 'ec-week9-tinkercad', 'lab3-exp2-tinkercad.png'),
             'Tinkercad 實驗二：源極直接接地，$R_1$ 100 Ω 搬到汲極，電表改量汲極對地電壓。', 9)
    r.para('它的 MOSFET 是通用模型，同樣條件下給的電流和 2N7000 差一截，所以只拿來看接法，數字不抄。')

    # ── 四、實驗數據與結果 ──────────────────────────────────────────────────
    r.h1('實驗數據與結果', REQ)
    r.h2('麵包版電路', REQ)
    photo_pair(r, ('實驗一全面.jpg', '實驗一量測現場：GPE-3323 雙路輸出（CH1 給閘極、CH2 給汲極，'
                                     '兩路負端共地）、麵包板、GDM-532 三用電表。'),
               ('實驗一麵包板.jpg', '實驗一接線：閘極跳線接 CH1，汲極跳線接 CH2，源極串 $R_1$ 1 kΩ '
                                   '回到共同負端，電表跨在 $R_1$ 兩端。'))
    photo_pair(r, ('實驗二全面.jpg', '實驗二量測現場：同一組儀器，CH1 改掃閘極 0～5 V、'
                                     'CH2 固定 1／3／5 V。'),
               ('實驗二麵包板.jpg', '實驗二接線：源極直接接地，$R_1$ 100 Ω 搬到汲極接 CH2，'
                                   '電表仍跨在 $R_1$ 兩端。'))

    r.h2('視波器結果照片/圖片', '（必要：若有使用到視波器）')
    r.para('這兩個實驗只用直流電源和三用電表，沒有用到示波器。')

    r.h2('實驗數據、表格', REQ)
    r.h3('基礎實驗', REQ)
    r.para('$R_1$ 開工前各量一次：實驗一 1000 Ω、實驗二 100.3 Ω。電流全部由 $R_1$ 的壓降換算'
           '（$I_D = V_{R_1}/R_1$），電表整場留在直流電壓檔，沒有把電流表串進迴路。')
    hdr1 = ['$V_{DS}$ 設定 (V)'] + [h for g in ('0', '2', '4', '6')
                                    for h in (f'$V_{{R_1}}$ ({g})', f'$I_D$ ({g})')]
    body1 = [[f(x, '%.1f')] + [v for g in range(4)
                               for v in (f(gr[g][0]), f(gr[g][1]))] for x, gr in e1]
    r.table(hdr1, body1, caption='實驗一記錄（括號內為 $V_{GS}$ 電源設定；電壓 V、電流 mA，與當天上傳 '
                                 'E3 的版本相同）。$R_1$ 是 1 kΩ，所以 $I_D$ 的毫安值和 $V_{R_1}$ 的'
                                 '伏特值數字相同', font_size=7)
    r.figure(os.path.join(BUILD, 'data-exp1.png'),
             '左：實驗一的 $I_D$–$V_{DS}$ 實測點；右：掃描過程中元件真正的 $V_{GS}$ 一路往下掉。', 14)

    hdr2 = ['$V_{GS}$ (V)'] + [h for g in ('1', '3', '5')
                               for h in (f'$V_{{R_1}}$ ({g})', f'$I_D$ ({g})')]
    body2 = [[f(x, '%.1f')] + [v for g in range(3)
                               for v in (f(gr[g][0]), f(gr[g][1]))] for x, gr in e2]
    r.table(hdr2, body2, caption='實驗二記錄（括號內為 $V_{DS}$ 電源設定；源極接地，所以表頭的 '
                                 '$V_{GS}$ 就是元件端的值）', font_size=8)
    r.figure(os.path.join(BUILD, 'data-exp2.png'),
             '左：實驗二的 $I_D$–$V_{GS}$ 實測點；右：同一組數據的 √$I_D$–$V_{GS}$。', 14)

    r.h3('進階實驗 I', OPT)
    r.para('實驗三（導通電阻）、實驗四（LED 開關）與第二部分的共源級放大器這次沒做，不繳。')
    r.h3('進階實驗 II', OPT)
    r.para('沒有做。')

    # ── 五、實驗結果分析 ────────────────────────────────────────────────────
    m1 = {x: gr for x, gr in e1}
    m2 = {x: gr for x, gr in e2}
    a = lambda v, g, i: D.fnum(m1[v][g][i])        # noqa: E731  實驗一
    b = lambda v, g, i: D.fnum(m2[v][g][i])        # noqa: E731  實驗二
    R2 = D.fnum(wb['實驗二 轉移曲線']['B4'].value)

    def vth(g):
        """用抬頭段最低的兩個點（2.0 / 2.5 V）做平方根外插。"""
        i1, i2 = b(2.0, g, 1), b(2.5, g, 1)
        if not i1 or not i2 or i1 <= 0 or i2 <= i1:
            return None
        return 2.0 - 0.5 / (i2 ** .5 - i1 ** .5) * i1 ** .5

    v3, v5 = vth(1), vth(2)

    r.h1('實驗結果分析', None)
    r.para(f'$V_{{GS}}$ 設定 4 V 和 6 V 兩組都照預期先陡升再變平。前面那一段的斜率幾乎正好是 1 mA/V：'
           f'4 V 組在 $V_{{DS}}$ 設定 0.5 V 和 1 V 讀到 {a(0.5, 2, 1):.3f} 和 {a(1.0, 2, 1):.3f} mA，'
           f'每加 0.5 V 就多 0.5 mA，那是 1 kΩ 的斜率，不是元件的。到 2.5 V 之後 4 V 組就平在 '
           f'{a(3.0, 2, 1):.2f} 到 {a(10.0, 2, 1):.2f} mA；6 V 組要到 5.5 V 才平，平台 '
           f'{a(5.5, 3, 1):.2f} 到 {a(10.0, 3, 1):.2f} mA。閘極電壓越高、膝點越往右，'
           f'和 $V_{{DS(\\text{{sat}})}} = V_{{GS}} - V_{{th}}$ 的說法對得上。')
    r.para(f'$V_{{GS}}$ 設定 2 V 那組進實驗室前我沒把握會不會導通，2N7000 規格書的 $V_{{GS(th)}}$ 範圍是 '
           f'0.8 到 3.0 V，2 V 剛好卡在中間。結果量到 {a(0.5, 1, 1):.3f} 到 {a(10.0, 1, 1):.3f} mA，'
           f'小歸小，卻穩定地跟著 $V_{{DS}}$ 慢慢爬。一開始還以為是電表零點沒歸好，做完實驗二才想通：'
           f'我這顆外插出來的 $V_{{th}}$ 是 1.9 V 左右，2 V 已經略高於門檻，有一點點電流反而才是對的。')
    r.para(f'源極串電阻的影響比我想像的大。6 V 那組元件端的 $V_{{GS}}$ 從 {a(0.0, 3, 2):.3f} V 一路掉到 '
           f'$V_{{DS}}$ 設定 10 V 時的 {a(10.0, 3, 2):.3f} V，4 V 那組從 {a(0.0, 2, 2):.3f} 掉到 '
           f'{a(10.0, 2, 2):.3f} V。兩組最後都停在 2.0 到 2.3 V，也就是臨界電壓再加一點過驅動。'
           f'電流一大源極就被抬高、把 $V_{{GS}}$ 壓回去，這就是負回授。所以把同一組數據換成元件端橫軸的那張圖'
           f'不是固定 $V_{{GS}}$ 的輸出特性曲線，而是自偏壓軌跡，線上每一個點的 $V_{{GS}}$ 都不一樣，'
           f'報告裡要標清楚，不然會被當成畫錯。')
    r.para(f'附帶一提，元件端 $V_{{DS}}$ 在最低那幾列算出來是 −{abs(a(0.5, 2, 3)):.3f} 到 −{abs(a(1.0, 3, 3)):.3f} V 的'
           f'小負數。那是電源設定值和電表讀值各差幾毫伏造成的，實際上元件兩端就是接近 0 V，不是真的反向。')
    r.para(f'實驗二三條線在 $V_{{GS}}$ 1.5 V 以下都讀到 0.000 V，2.0 V 開始有電流，3.0 V 以後貼上平台：'
           f'{b(5.0, 0, 1):.2f}、{b(5.0, 1, 1):.2f}、{b(5.0, 2, 1):.2f} mA。這三個數字幾乎就是 '
           f'$V_{{DS}}/R_1$（{1 / R2 * 1000:.2f}、{3 / R2 * 1000:.2f}、{5 / R2 * 1000:.2f} mA），'
           f'差不到 3%。所以那一段的高度完全是 100 Ω 決定的，跟元件無關。元件這時候已經變成一顆小電阻，'
           f'電壓幾乎都落在 $R_1$ 上。')
    r.para(f'$V_{{th}}$ 這題我只做到一半。當天只掃了 0.5 V 一階，抬頭那一段每組只落得到一個點'
           f'（$V_{{GS}}$ = 2.5 V 那一列），平方根外插需要兩個都在平方律直線上的點，我只能拿 2.0 V 和 '
           f'2.5 V 這兩個去湊：3 V 組算出 {v3:.2f} V、5 V 組 {v5:.2f} V。兩個值很接近，也落在 2N7000 '
           f'規格書 0.8 到 3.0 V 的範圍內，但級距太粗，只能當量級參考。1 V 那組在 2.5 V 就讀到 '
           f'{b(2.5, 0, 1):.2f} mA、幾乎貼上 {b(5.0, 0, 1):.2f} mA 的平台了，拿它外插沒有意義，所以沒算。'
           f'早知道當場就該在 2.0 到 2.6 V 之間用 0.05 V 一階補幾點，下次先粗掃找位置、再回頭加密。')
    r.para(f'最後把兩個實驗擺在一起看反而是收穫最大的地方。實驗一的自偏壓最後停在元件端 $V_{{GS}}$ '
           f'{a(10.0, 3, 2):.2f} 到 {a(10.0, 2, 2):.2f} V，實驗二外插的 $V_{{th}}$ 是 1.9 V 上下，'
           f'中間差的 0.1 到 0.3 V 正好是撐起那幾毫安所需要的過驅動電壓。兩個電路、兩種量法，對得起來。')

    # ── 六、心得 ────────────────────────────────────────────────────────────
    r.h1('心得', None)
    r.para('這次最大的收穫是弄懂「電阻接在哪一隻腳」有多要命。同一顆元件、同一組電源，電阻放源極量到的是'
           '自偏壓軌跡，放汲極才量得到真正的轉移曲線；而且兩邊的平台意思完全相反，實驗一的平台是元件說了算、'
           '實驗二的平台是電阻說了算。另一個教訓是 $V_{th}$ 那題：粗掃只是用來找位置，真正要外插的點得回頭'
           '加密再量一次，這個順序下次一定照做。')

    out = out or os.path.join(OUT_DIR, f'{sid}_{name}_Lab 3 結報.docx')
    r.save(out, force=force)
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('-o')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()
    build(args.id, args.name, args.o, args.force)
