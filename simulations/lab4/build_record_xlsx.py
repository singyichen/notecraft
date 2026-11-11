#!/usr/bin/env python3
"""產生 Lab 4 當天用的資料記錄簿 measured/Lab4-數據記錄.xlsx。

講義（App_Lab4_5 第 10／11 頁）每個實驗只要一組讀值：輸入波形、輸出波形、
理論增益、實測增益。助教公告寫「依照實驗操作與數據結果記錄完整度做加分」，
所以兩個實驗各加兩張掃描表：

  表 A 振幅掃描：輸入 2～15 V_pp 每 1 V 一點。看增益在削平之前是不是真的是常數，
                 以及非反相組態幾伏開始撞電源軌（LTspice 預報在 9～10 V_pp 之間）。
  表 B 頻率掃描：100 Hz 到 1 MHz 共 8 點。1 kHz 時增益還是平的，拉到 1 MHz
                 掉到 1 倍以下——這就是講義問題 3 要的數據。

黃底 = 當天要填的格子；藍字 = LTspice 預報值（uA741 Boyle macromodel，±15 V）。

用法：cd simulations/lab4 && ../lab1/.venv/bin/python build_record_xlsx.py
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

OUT = os.path.join(HERE, 'measured', 'Lab4-數據記錄.xlsx')
PRED = os.path.join(HERE, 'ltspice-pred.json')

with open(PRED, encoding='utf-8') as fh:
    P = json.load(fh)

AMP = P['amp_Vpp']
FREQ = P['freq']
R1_NOM, R2_NOM = 100e3, 200e3
NOMINAL = {1: 3.0, 2: -2.0}
SPEC = {
    1: dict(name='實驗一 非反相放大器', av='1 + R2/R1 = +3', phase='同相（0°）',
            pin='訊號進腳 3，R1 從腳 2 接到地'),
    2: dict(name='實驗二 反相放大器', av='−R2/R1 = −2', phase='反相（180°）',
            pin='訊號進 R1 左端，腳 3 直接接地'),
}

PCT = '0.0%'
F3 = '0.000'
F2 = '0.00'


def info_block(ws, row, exp):
    """表頭上方的器材與設定區：電阻實測值、電源、頻率。"""
    rx.put(ws, row, 1, '當天先量好這幾個值（之後所有理論值都用實測電阻算）',
           font=rx.BOLD, fill=rx.FILL_HD)
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=6)
    rows = [
        ('R1 標稱（Ω）', R1_NOM, None, '#,##0', '講義規格 100 kΩ 1/4 W'),
        ('R1 實測（Ω）', None, rx.FILL_IN, '#,##0', '用 GDM-532 電阻檔量，接上電路前量'),
        ('R2 標稱（Ω）', R2_NOM, None, '#,##0', '講義規格 200 kΩ 1/4 W'),
        ('R2 實測（Ω）', None, rx.FILL_IN, '#,##0', '同上'),
        ('V+ 實測（V）', None, rx.FILL_IN, F3, '通電後量腳 7 對地，應該接近 +15'),
        ('V− 實測（V）', None, rx.FILL_IN, F3, '量腳 4 對地，應該接近 −15'),
        ('訊號頻率（Hz）', 1000, None, '#,##0', '講義指定 1 kHz'),
    ]
    for i, (lab, val, fill, fmt, why) in enumerate(rows):
        r = row + 1 + i
        rx.put(ws, r, 1, lab)
        rx.put(ws, r, 2, val, fill=fill, fmt=fmt,
               font=rx.BLUE if val is not None else rx.BLACK)
        rx.put(ws, r, 3, why, font=rx.NOTE)
    r = row + 1 + len(rows)
    rx.put(ws, r, 1, '實測電阻算出的理論 A_v')
    if exp == 1:
        rx.put(ws, r, 2, f'=IF(OR(B{row+2}="",B{row+4}=""),"",1+B{row+4}/B{row+2})',
               fmt=F3, fill=None, font=rx.BLACK)
    else:
        rx.put(ws, r, 2, f'=IF(OR(B{row+2}="",B{row+4}=""),"",-B{row+4}/B{row+2})',
               fmt=F3, fill=None, font=rx.BLACK)
    rx.put(ws, r, 3, f'標稱值算出來是 {NOMINAL[exp]:+.3f}；電阻各差 1% 時理論值就會動',
           font=rx.NOTE)
    return r + 2, row + 2, row + 4   # 下一列、R1 實測格列號、R2 實測格列號


def amp_table(ws, row, exp, av_cell):
    pred = P[f'exp{exp}_vo_pp']
    rx.put(ws, row, 1, '表 A 振幅掃描（1 kHz 固定，改訊號產生器的 Amplitude）',
           font=rx.BOLD, fill=rx.FILL_HD)
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
    hdr = row + 1
    rx.head(ws, hdr, ['產生器設定\nV_in (V_pp)', '實測 V_in\n(V_pp)', '實測 V_out\n(V_pp)',
                      '實測 |A_v|', '理論 |A_v|\n（實測電阻）', 'LTspice 預報\nV_out (V_pp)',
                      '與預報的偏差'],
            widths=[15, 13, 13, 12, 14, 17, 14], height=54)
    r0 = hdr + 1
    for i, a in enumerate(AMP):
        r = r0 + i
        rx.put(ws, r, 1, a, font=rx.BLUE, fmt=F2, align='center')
        rx.put(ws, r, 2, None, fill=rx.FILL_IN, fmt=F3)
        rx.put(ws, r, 3, None, fill=rx.FILL_IN, fmt=F3)
        rx.put(ws, r, 4, f'=IF(OR(B{r}="",C{r}=""),"",C{r}/B{r})', fmt=F3)
        rx.put(ws, r, 5, f'=IF({av_cell}="","",ABS({av_cell}))', fmt=F3)
        rx.put(ws, r, 6, round(pred[i], 3), font=rx.BLUE, fmt=F3)
        rx.put(ws, r, 7, rx.dev(f'C{r}', f'F{r}'), fmt=PCT)
    r1 = r0 + len(AMP) - 1
    rx.note(ws, r1 + 1,
            '非反相組態的 LTspice 預報在 9 V_pp 還是線性（27.0 V_pp）、10 V_pp 就被壓到 29.2 V_pp；'
            '當天若更早削平，先確認電源真的是 ±15 V。'
            if exp == 1 else
            '反相組態的增益只有 2，LTspice 預報到 14 V_pp 都還是線性（28.0 V_pp），'
            '要 15 V_pp 才被壓到 29.2 V_pp；想在這張表上看到削平，得把輸入再往上推。')
    rx.note(ws, r1 + 2,
            '實測 V_in 用示波器 CH1 的 Pk-Pk 讀值，不要抄產生器面板的設定值'
            '（開路時面板值約為實際的兩倍）。')
    return r0, r1, r1 + 4


def freq_table(ws, row, exp):
    gain = P[f'exp{exp}_av_f']
    ph = P[f'exp{exp}_ph_f']
    rx.put(ws, row, 1, '表 B 頻率掃描（輸入固定 2 V_pp，只改頻率）',
           font=rx.BOLD, fill=rx.FILL_HD)
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=7)
    hdr = row + 1
    rx.head(ws, hdr, ['頻率 (Hz)', '實測 V_in\n(V_pp)', '實測 V_out\n(V_pp)', '實測 |A_v|',
                      'LTspice 預報\n|A_v|', '預報相位\n(°)', '波形還是正弦嗎\n（是／削平／三角）'],
            widths=[13, 13, 13, 12, 14, 12, 20], height=54)
    r0 = hdr + 1
    for i, f in enumerate(FREQ):
        r = r0 + i
        rx.put(ws, r, 1, f, font=rx.BLUE, fmt='#,##0', align='center')
        rx.put(ws, r, 2, None, fill=rx.FILL_IN, fmt=F3)
        rx.put(ws, r, 3, None, fill=rx.FILL_IN, fmt=F3)
        rx.put(ws, r, 4, f'=IF(OR(B{r}="",C{r}=""),"",C{r}/B{r})', fmt=F3)
        rx.put(ws, r, 5, round(gain[i], 4), font=rx.BLUE, fmt='0.0000')
        rx.put(ws, r, 6, round(ph[i], 1), font=rx.BLUE, fmt='0.0')
        rx.put(ws, r, 7, None, fill=rx.FILL_IN)
    r1 = r0 + len(FREQ) - 1
    rx.note(ws, r1 + 1,
            '輸入壓到 2 V_pp 是為了避開迴轉率：1 MHz 用 8 V_pp 時輸出會被鎖成三角波'
            '（只剩 0.19 V_pp），量到的就不是頻寬而是迴轉率。兩種都記下來更完整。')
    rx.note(ws, r1 + 2,
            '想另外驗迴轉率：把 1 MHz 那一列的輸入改回 8 V_pp 再量一次，'
            '輸出斜率應該貼著 0.5 V/µs。')
    return r0, r1, r1 + 4


def handout_block(ws, row, exp, amp_rows, av_cell):
    """照講義第 10／11 頁版面的那一格，交報告時直接抄。"""
    r0, r1 = amp_rows
    target = AMP.index(8.0)
    tr = r0 + target
    rx.put(ws, row, 1, '講義版面（第 %d 頁）：Ampl 4 ＝ 8 V_pp 那一點' % (10 if exp == 1 else 11),
           font=rx.BOLD, fill=rx.FILL_HD)
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=4)
    rows = [
        ('Input waveform', f'=IF(B{tr}="","",B{tr}&" V_pp 正弦波，1 kHz")'),
        ('Output waveform', f'=IF(C{tr}="","",C{tr}&" V_pp，{SPEC[exp]["phase"]}")'),
        ('A_v (theoretical calculation)', f'=IF({av_cell}="","",{av_cell})'),
        ('A_v (experimental calculation)',
         f'=IF(OR(B{tr}="",C{tr}=""),"",{"" if exp == 1 else "-"}C{tr}/B{tr})'),
        ('v_o（講義上那一格）', f'=IF(C{tr}="","",C{tr}/2&" V 峰值")'),
    ]
    for i, (lab, f) in enumerate(rows):
        r = row + 1 + i
        rx.put(ws, r, 1, lab, font=rx.BOLD)
        rx.put(ws, r, 2, f, fmt=F3 if 'A_v' in lab else None)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=4)
    rx.note(ws, row + 1 + len(rows),
            '這一格會跟著表 A 第 %d 列自動更新，報告直接抄這裡就好。' % tr)
    return row + len(rows) + 3


def sheet(wb, exp):
    sp = SPEC[exp]
    ws = wb.create_sheet(sp['name'])
    rx.title_block(ws, f'Lab 4 {sp["name"]}',
                   f'uA741，R1 = 100 kΩ、R2 = 200 kΩ，理論 A_v = {sp["av"]}；{sp["pin"]}。'
                   f'　黃底＝當天填，藍字＝LTspice 預報。', 7)
    row, _r1, _r2 = info_block(ws, 4, exp)
    av_cell = f'$B${row - 2}'        # 資訊區最後一列：用實測電阻算出的理論 A_v
    a0, a1, row = amp_table(ws, row, exp, av_cell)
    f0, f1, row = freq_table(ws, row, exp)
    row = handout_block(ws, row, exp, (a0, a1), av_cell)

    ch = rx.scatter('輸出振幅 vs 輸入振幅（實測點 vs LTspice）', 'V_in (V_pp)', 'V_out (V_pp)')
    xs = rx.ref(ws, 1, a0, a1)
    meas = [rx.gated(f'C{r}', f'C{r}') for r in range(a0, a1 + 1)]
    cc = 9
    for i, f in enumerate(meas):
        rx.put(ws, a0 + i, cc, f, fmt=F3, border=False)
    rx.put(ws, a0 - 1, cc, '圖用：實測 V_out', font=rx.NOTE, border=False)
    ch.series.append(rx.dot_series(rx.ref(ws, cc, a0, a1), xs, '實測'))
    ch.series.append(rx.line_series(rx.ref(ws, 6, a0, a1), xs, 'LTspice 預報'))
    ws.add_chart(ch, f'K{a0 + 1}')

    ch2 = rx.scatter('增益 vs 頻率（實測點 vs LTspice）', '頻率 (Hz)', '|A_v|')
    ch2.x_axis.scaling.logBase = 10
    xs2 = rx.ref(ws, 1, f0, f1)
    for i in range(len(FREQ)):
        rx.put(ws, f0 + i, cc, rx.gated(f'D{f0 + i}', f'C{f0 + i}'), fmt=F3, border=False)
    rx.put(ws, f0 - 1, cc, '圖用：實測 |A_v|', font=rx.NOTE, border=False)
    ch2.series.append(rx.dot_series(rx.ref(ws, cc, f0, f1), xs2, '實測', rx.MARKS[1]))
    ch2.series.append(rx.line_series(rx.ref(ws, 5, f0, f1), xs2, 'LTspice 預報'))
    ws.add_chart(ch2, f'K{f0 + 1}')

    row = rx.checklist(ws, row, [
        ('示波器畫面（8 V_pp 那一點）', 'CH1 與 CH2 同畫面，[Meas] 的 Pk-Pk 讀值入鏡；用 [Save/Recall] 存 USB'),
        ('示波器畫面（削平那一點）' if exp == 1 else '示波器畫面（1 MHz）',
         '非反相組態拉到 10 V_pp 以上拍一張削平的' if exp == 1 else '大訊號被鎖成三角波那一張'),
        ('相位確認 1 張', f'輸入與輸出的相對相位應該是 {sp["phase"]}'),
        ('麵包板照片 1 張', '整塊板入鏡，看得出 uA741 缺口方向與各條跳線'),
        ('電阻實測值 2 筆', '已填在上面的資訊區'),
    ]) + 1
    ws.column_dimensions['A'].width = 23      # head() 會把 A 設回 15，所以放在最後
    ws.column_dimensions['C'].width = 14
    ws.freeze_panes = ws.cell(row=a0, column=2)
    rx.printable(ws, 7, row)
    return ws


def readme(wb):
    ws = wb.create_sheet('說明', 0)
    rx.title_block(ws, 'Lab 4 數據記錄簿（11/14）',
                   'Noninverting Amplifier & Inverting Amplifier；講義 App_Lab4_5 第 8–11 頁。', 4)
    ws.column_dimensions['A'].width = 18
    ws.column_dimensions['B'].width = 104
    rows = [
        ('怎麼用', '兩個實驗各一張工作表。先把資訊區的電阻實測值填好，再從表 A 的 8 V_pp '
                   '那一列開始量（那是講義指定的工作點），有時間再往上下掃完整張表。'),
        ('顏色', '黃底＝當天要填；藍字＝講義規格或 LTspice 預報值；其餘是公式，填完自己會更新。'),
        ('表 A', '振幅掃描 2～15 V_pp。重點是「削平之前增益是常數」——把實測 |A_v| 那一欄'
                 '看過去，應該一路是 3.00（或 2.00），直到非反相組態撞到電源軌為止。'),
        ('表 B', '頻率掃描 100 Hz～1 MHz。輸入固定 2 V_pp 避開迴轉率，量到的才是頻寬。'
                 '這張表就是講義問題 3 的答案。'),
        ('講義版面', '每張工作表最下面有一格照講義第 10／11 頁排好的摘要，交報告直接抄。'),
        ('單位', '一律用 V_pp（峰對峰值）記錄，不要混用峰值。講義電路圖上的「Ampl: 4」是'
                 '4 V 峰值，也就是 8 V_pp——對照第 21 頁的 LTspice 波形可以確認。'),
        ('沒做完怎麼辦', '助教公告：完成一個實驗 70 分、兩個 85 分，其餘看記錄完整度加分。'
                         '先把兩個實驗的 8 V_pp 那一點做完，再回頭補掃描表。'),
    ]
    for i, (k, v) in enumerate(rows):
        r = 4 + i * 2
        rx.put(ws, r, 1, k, font=rx.BOLD, fill=rx.FILL_GP)
        c = rx.put(ws, r, 2, v)
        c.alignment = Alignment(wrap_text=True, vertical='top')
        ws.row_dimensions[r].height = 42
    r = 4 + len(rows) * 2
    rx.put(ws, r, 1, '離開實驗室前', font=rx.BOLD, fill=rx.FILL_HD)
    rx.put(ws, r, 2, '兩張工作表最下面的拍照檢查表逐項打勾；示波器畫面存 USB，不要手機翻拍。',
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
    for exp in (1, 2):
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
