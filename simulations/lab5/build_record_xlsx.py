#!/usr/bin/env python3
"""產生 Lab 5 當天用的資料記錄簿 measured/Lab5-數據記錄.xlsx。

講義（App_Lab4_5 第 24 頁）的資料表每個實驗只要一組讀值：兩路輸入的 V_pp、
輸出的理論值與實測值、理論與實測增益。助教公告寫「依照實驗操作與數據結果
記錄完整度做加分」，所以每個實驗再加一張掃描表：

  固定一路、掃另一路的振幅（0～5 V 峰值共 6 點），看輸出是不是真的線性相加／相減。
  減法器那張的最後一點 V_in2 = V_in1 就是共模輸入，理想輸出 0——實際剩下的
  殘餘就是四顆電阻的失配，正好是講義問題 1 要的數據。

黃底 = 當天要填的格子；藍字 = LTspice 預報值（uA741 Boyle macromodel，±15 V，1 kHz）。

用法：cd simulations/lab5 && ../lab1/.venv/bin/python build_record_xlsx.py
      --force 直接覆蓋舊檔；不給旗標時檔案已存在就不動它。
"""
from __future__ import annotations

import json
import os
import sys

from openpyxl import Workbook
from openpyxl.styles import Alignment

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'tools'))

import record_xlsx as rx  # noqa: E402

OUT = os.path.join(HERE, 'measured', 'Lab5-數據記錄.xlsx')
PRED = os.path.join(HERE, 'ltspice-pred.json')

with open(PRED, encoding='utf-8') as fh:
    P = json.load(fh)

A2 = P['a2']                 # 掃描的 V_in2 峰值（V）
PCT = '0.0%'
F3 = '0.000'
F2 = '0.00'

SPEC = {
    1: dict(name='實驗一 反相加法器', page=21,
            law='V_out = −(V_in1 + V_in2)', phase='反相（180°）',
            fix_label='V_in1（固定）', nominal=2.0,
            note='兩路各經一顆 10 kΩ 進虛接地點；輸出應該是兩路振幅的和，相位相反。'),
    2: dict(name='實驗二 同相加法器', page=22,
            law='V_out = V_in1 + V_in2', phase='同相（0°）',
            fix_label='V_in1（固定）', nominal=2.0,
            note='「+」端先把兩路分壓成平均值，再被 1 + R3/R4 = 2 倍放大回來；輸出同相。'),
    3: dict(name='實驗三 減法器', page=23,
            law='V_out = V_in1 − V_in2', phase='跟著差值的正負',
            fix_label='V_in1（固定）', nominal=5.0,
            note='V_in1 走「+」端、V_in2 走「−」端；最後一列兩路同振幅，就是共模測試。'),
}


def theory(exp, fix_cell, v2_cell):
    """理論輸出 V_pp（都用峰對峰值記錄，所以直接把兩路的 V_pp 加減）。"""
    if exp == 3:
        return f'=IF(OR({fix_cell}="",{v2_cell}=""),"",ABS({fix_cell}-{v2_cell}))'
    return f'=IF(OR({fix_cell}="",{v2_cell}=""),"",{fix_cell}+{v2_cell})'


def info_block(ws, row, exp):
    sp = SPEC[exp]
    rx.put(ws, row, 1, '當天先量好這幾個值（四顆電阻都要，減法器的共模全看它們配得準不準）',
           font=rx.BOLD, fill=rx.FILL_HD)
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    rows = [
        ('R1 實測（Ω）', '#,##0', '標稱 10 kΩ 1/4 W；接上電路前用 GDM-532 電阻檔量'),
        ('R2 實測（Ω）', '#,##0', '同上'),
        ('R3 實測（Ω）', '#,##0', '同上'),
        ('R4 實測（Ω）', '#,##0',
         '同上（這個實驗只有三顆電阻，R4 留白）' if exp == 1 else '同上'),
        ('V+ 實測（V）', F3, '通電後量腳 7 對地，應該接近 +15'),
        ('V− 實測（V）', F3, '量腳 4 對地，應該接近 −15'),
    ]
    for i, (lab, fmt, why) in enumerate(rows):
        r = row + 1 + i
        rx.put(ws, r, 1, lab)
        rx.put(ws, r, 2, None, fill=rx.FILL_IN, fmt=fmt)
        rx.put(ws, r, 3, why, font=rx.NOTE)
    r = row + 1 + len(rows)
    rx.put(ws, r, 1, '四顆電阻的最大偏差')
    rx.put(ws, r, 2,
           f'=IF(COUNT(B{row+1}:B{row+4})<2,"",'
           f'(MAX(B{row+1}:B{row+4})-MIN(B{row+1}:B{row+4}))/AVERAGE(B{row+1}:B{row+4}))',
           fmt=PCT)
    rx.put(ws, r, 3, '減法器的 CMRR 幾乎只由這個數字決定：差 1% → CMRR 約 46 dB',
           font=rx.NOTE)
    rx.put(ws, r + 1, 1, '這個電路的關係式')
    rx.put(ws, r + 1, 2, sp['law'], font=rx.BOLD)
    rx.put(ws, r + 1, 3, sp['note'], font=rx.NOTE)
    return r + 3


def sweep_table(ws, row, exp):
    sp = SPEC[exp]
    pred = P[f'exp{exp}_vo_pp']
    fix_pk = P[f'exp{exp}_fix']
    rx.put(ws, row, 1,
           f'掃描表：V_in1 固定 {fix_pk:g} V 峰值（{2 * fix_pk:g} V_pp），改 V_in2 的振幅，1 kHz',
           font=rx.BOLD, fill=rx.FILL_HD)
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=8)
    hdr = row + 1
    rx.head(ws, hdr, ['產生器 CH2 設定\nV_in2 峰值 (V)', '實測 V_in1\n(V_pp)', '實測 V_in2\n(V_pp)',
                      '實測 V_out\n(V_pp)', '理論 V_out\n(V_pp)', 'LTspice 預報\nV_out (V_pp)',
                      '與理論的偏差', '輸出相位\n（同相／反相）'],
            widths=[17, 13, 13, 13, 13, 17, 13, 15], height=54)
    r0 = hdr + 1
    for i, a in enumerate(A2):
        r = r0 + i
        rx.put(ws, r, 1, a, font=rx.BLUE, fmt=F2, align='center')
        rx.put(ws, r, 2, None, fill=rx.FILL_IN, fmt=F3)
        rx.put(ws, r, 3, None, fill=rx.FILL_IN, fmt=F3)
        rx.put(ws, r, 4, None, fill=rx.FILL_IN, fmt=F3)
        rx.put(ws, r, 5, theory(exp, f'B{r}', f'C{r}'), fmt=F3)
        rx.put(ws, r, 6, round(pred[i], 4), font=rx.BLUE, fmt='0.0000')
        rx.put(ws, r, 7, rx.dev(f'D{r}', f'E{r}'), fmt=PCT)
        rx.put(ws, r, 8, None, fill=rx.FILL_IN)
    r1 = r0 + len(A2) - 1
    if exp == 3:
        for c in range(1, 9):
            ws.cell(row=r1, column=c).fill = rx.FILL_OK if c not in (2, 3, 4, 8) else rx.FILL_IN
        rx.note(ws, r1 + 1,
                '最後一列 V_in2 = V_in1 = 5 V 峰值，就是把兩端接到同一個訊號（共模）。'
                '理想輸出 0，LTspice 用完美配對的電阻也只剩 0.3 mV；實際量到多少就寫多少，'
                '那個值除以 10 V_pp 再取對數就是這組電阻的 CMRR。')
        rx.note(ws, r1 + 2,
                '想省事可以把兩條蕊線都夾在第 40 欄（V_in1 那一欄），一台產生器就能做共模測試。')
    elif exp == 1:
        rx.note(ws, r1 + 1,
                '第一列 V_in2 = 0：把 CH2 的振幅轉到最小（這一路拔掉蕊線也可以——另一端是虛接地，'
                '開路與接地的結果一樣），輸出應該只剩下 V_in1 那一路的貢獻 4 V_pp。'
                '這是「虛接地把兩路隔開」最快的驗證。')
        rx.note(ws, r1 + 2,
                '實測 V_in1／V_in2 要各量一次：示波器 CH1 的探棒先夾一路、記好，再移到另一路。')
    else:
        rx.note(ws, r1 + 1,
                '第一列 V_in2 = 0：這一路只能把 CH2 的振幅轉到最小，不可以拔蕊線。'
                '同相加法器拔掉之後那一路是開路、不是接地，V+ 會從 (V_in1+V_in2)/2 變成 V_in1，'
                '輸出變成 8 V_pp（預報的兩倍）。兩路在這裡本來就會互相負載，'
                '這正是它和反相加法器最大的差別。', font=rx.WARN)
        rx.note(ws, r1 + 2,
                '實測 V_in1／V_in2 要各量一次：示波器 CH1 的探棒先夾一路、記好，再移到另一路。')
    return r0, r1, r1 + 4


def handout_block(ws, row, exp, rows_ref):
    """照講義第 24 頁的資料表，交報告直接抄。取掃描表裡 V_in2 = 3 V 峰值那一列。"""
    sp = SPEC[exp]
    r0, _ = rows_ref
    target = A2.index(3 if exp != 3 else 2)
    tr = r0 + target
    rx.put(ws, row, 1,
           f'講義版面（第 24 頁的 Experiment data table）：V_in2 = {A2[target]} V 峰值那一點',
           font=rx.BOLD, fill=rx.FILL_HD)
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=4)
    rows = [
        ('V_in1-pp', f'=IF(B{tr}="","",B{tr})'),
        ('V_in2-pp', f'=IF(C{tr}="","",C{tr})'),
        ('Output voltage (theoretical calculation)', f'=IF(E{tr}="","",E{tr})'),
        ('Output voltage (experimental calculation)', f'=IF(D{tr}="","",D{tr})'),
        ('A_v (theoretical calculation)', f'"{sp["law"]}"'),
        ('A_v (experimental calculation)',
         f'=IF(OR(D{tr}="",E{tr}="",E{tr}=0),"",D{tr}/E{tr})'),
        ('Waveform', f'=IF(H{tr}="","",H{tr}&"；1 kHz 正弦波")'),
    ]
    for i, (lab, f) in enumerate(rows):
        r = row + 1 + i
        rx.put(ws, r, 1, lab, font=rx.BOLD)
        rx.put(ws, r, 2, ('=' + f) if f.startswith('"') else f,
               fmt=F3 if 'voltage' in lab or 'pp' in lab else None)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
    rx.note(ws, row + 1 + len(rows),
            f'這一格跟著掃描表第 {tr} 列自動更新。'
            '「A_v (experimental)」這裡算的是實測輸出與理論輸出的比值，等於 1 就代表完全吻合。')
    return row + len(rows) + 3


def sheet(wb, exp):
    sp = SPEC[exp]
    ws = wb.create_sheet(sp['name'])
    rx.title_block(ws, f'Lab 5 {sp["name"]}',
                   f'uA741，電阻全部 10 kΩ；{sp["law"]}；講義第 {sp["page"]} 頁的電路。'
                   '　黃底＝當天填，藍字＝LTspice 預報。', 8)
    row = info_block(ws, 4, exp)
    s0, s1, row = sweep_table(ws, row, exp)
    row = handout_block(ws, row, exp, (s0, s1))

    ch = rx.scatter('輸出 vs V_in2（實測點 vs 理論直線）', 'V_in2 設定（V 峰值）', 'V_out (V_pp)')
    xs = rx.ref(ws, 1, s0, s1)
    cc = 10
    rx.put(ws, s0 - 1, cc, '圖用：實測 V_out', font=rx.NOTE, border=False)
    for i in range(len(A2)):
        rx.put(ws, s0 + i, cc, rx.gated(f'D{s0 + i}', f'D{s0 + i}'), fmt=F3, border=False)
    ch.series.append(rx.dot_series(rx.ref(ws, cc, s0, s1), xs, '實測'))
    ch.series.append(rx.line_series(rx.ref(ws, 6, s0, s1), xs, 'LTspice 預報'))
    ws.add_chart(ch, f'L{s0}')

    items = [
        ('示波器畫面 1 張', 'CH1 = V_in1、CH2 = V_out 同畫面，[Meas] 的 Pk-Pk 入鏡，存 USB'),
        ('示波器畫面 1 張', 'CH1 移到 V_in2 再拍一次，確認兩路同頻率同相位'),
        ('麵包板照片 1 張', '整塊板入鏡，看得出缺口方向與各條跳線'),
        ('四顆電阻實測值', '已填在上面的資訊區'),
    ]
    if exp == 3:
        items.insert(2, ('共模測試畫面 1 張', '兩端接同一訊號時的輸出，垂直檔位轉到 mV 等級才看得見'))
    row = rx.checklist(ws, row, items) + 1
    ws.column_dimensions['A'].width = 30      # head() 會把 A 設回 17，所以放在最後
    ws.column_dimensions['C'].width = 14
    ws.freeze_panes = ws.cell(row=s0, column=2)
    rx.printable(ws, 8, row)
    return ws


def readme(wb):
    ws = wb.create_sheet('說明', 0)
    rx.title_block(ws, 'Lab 5 數據記錄簿（11/21）',
                   'Summing Amplifier；講義 App_Lab4_5 第 19–24 頁。', 4)
    ws.column_dimensions['A'].width = 18
    ws.column_dimensions['B'].width = 104
    rows = [
        ('怎麼用', '三個實驗各一張工作表。先量四顆電阻填進資訊區，再從掃描表 V_in2 = 3 V 峰值'
                   '（減法器是 2 V 峰值）那一列開始——那是講義指定的工作點。'),
        ('計分', '助教公告：實驗一 70 分、實驗一＋二 85 分、三個都做 100 分，再依記錄完整度加分。'
                 '所以順序一定是實驗一 → 實驗二 → 實驗三，不要跳著做。'),
        ('省時間的做法', '實驗二與實驗三是**同一塊板、同樣的元件位置**，只要把第 14 欄與第 46 欄的'
                         '「接地／吃訊號」對調就換好電路了。做完實驗二不要拆板。'),
        ('兩路訊號', 'AFG-2225 是雙通道，CH1 與 CH2 的 BNC 外殼在機器內部已經共地，接一條地線就夠。'
                     '兩個通道必須同頻率、同相位：按 [Utility] → Channel Coupling 打開，'
                     '或用示波器確認兩路過零點對齊。'),
        ('單位', '一律用 V_pp 記錄。講義電路圖上的「Ampl: 2／3／5」是峰值，換算成 V_pp 要乘 2'
                 '（對照第 21 頁的 LTspice 波形可以確認）。'),
        ('頻率', '講義圖上寫 100 Hz，但助教在第 21 頁批註「500 or 1k Hz，太低頻易出問題」，'
                 '所以記錄簿一律用 1 kHz。'),
        ('共模測試', '實驗三掃描表的最後一列是共模（兩端同訊號），理想輸出 0。'
                     '那一格量到的殘餘電壓就是講義問題 1 的答案來源。'),
    ]
    for i, (k, v) in enumerate(rows):
        r = 4 + i * 2
        rx.put(ws, r, 1, k, font=rx.BOLD, fill=rx.FILL_GP)
        c = rx.put(ws, r, 2, v.replace('**', ''))
        c.alignment = Alignment(wrap_text=True, vertical='top')
        ws.row_dimensions[r].height = 44
    r = 4 + len(rows) * 2
    rx.put(ws, r, 1, '離開實驗室前', font=rx.BOLD, fill=rx.FILL_HD)
    rx.put(ws, r, 2, '三張工作表最下面的拍照檢查表逐項打勾；示波器畫面存 USB，不要手機翻拍。',
           font=rx.WARN)
    rx.printable(ws, 2, r, landscape=False)
    return ws


def main() -> int:
    force = '--force' in sys.argv
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    if os.path.exists(OUT) and not force:
        print(f'{OUT} 已存在，沒有動它（要重產請加 --force）')
        return 0
    wb = Workbook()
    wb.remove(wb.active)
    readme(wb)
    for exp in (1, 2, 3):
        sheet(wb, exp)
    bad = rx.check_formulas(wb)
    if bad:
        for t in bad:
            print('公式有問題：', t, file=sys.stderr)
        return 1
    wb.save(OUT)
    print('寫出', os.path.normpath(OUT))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
