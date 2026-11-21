#!/usr/bin/env python3
"""Lab 5 實驗數據結果（當天上傳用）：把三個實驗的示波器讀值排成講義第 24 頁的版面，
每個實驗一張表（標題 / 波形圖 / Vin1-pp 與 Vin2-pp / 理論輸出 / 實測輸出），輸出 .docx 再轉 PDF。

11/21 的實際接法是「一路交流、一路直流」：
  V_in1 = 示波器 EDUX1052G 的 Gen Out，100 Hz 正弦波
  V_in2 = 直流電源供應器 GPE-3323 CH3 的固定 +5 V
所以理論值逐點算（不是用峰對峰值）：
  實驗一 反相加法器  V_out = -(V_in1 + 5)
  實驗二 同相加法器  V_out =  V_in1 + 5
  實驗三 減法器      V_out =  V_in1 - 5

波峰／波谷讀值來自 measured/photos/ 的三張示波器畫面（統計表的「當前」欄），
峰對峰值會和 measured/Lab5-數據記錄.xlsx 互相核對，對不上就中止。

用法：cd simulations/lab5 && ../lab1/.venv/bin/python report/build_lab5_data_results.py \
          --id 515661055 --name 陳欣怡
"""
import argparse
import os
import subprocess
import sys

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt
from openpyxl import load_workbook

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.abspath(os.path.join(HERE, '..'))
ROOT = os.path.abspath(os.path.join(LAB, '..', '..'))
XLSX = os.path.join(LAB, 'measured', 'Lab5-數據記錄.xlsx')
IMG_DIR = os.path.join(ROOT, 'public', 'note-images', 'ec-week11-measured')
OUT_DIR = os.path.join(ROOT, 'src', 'content', 'notes', '_outputs', 'lab5')

VIN2_DC = 5.0          # GPE-3323 CH3 固定 +5 V

# 示波器「當前」欄的波峰／波谷（V），依序是 V_in1 波谷、V_in1 波峰、V_out 波谷、V_out 波峰
EXPS = [
    dict(key='exp1', sheet='實驗一 反相加法器', row=15, vout_col=4,
         title='the inverting summing amplifier circuit configuration of an op-amp',
         zh='實驗一　反相加法器', img='lab5-exp1-scope.jpg',
         vin1=(-2.17, 2.17), vout=(-2.65, -6.75),
         theory=lambda v: -(v + VIN2_DC)),
    dict(key='exp2', sheet='實驗二 同相加法器', row=16, vout_col=5,
         title='the summing amplifier circuit configuration of an op-amp',
         zh='實驗二　同相加法器', img='lab5-exp2-scope.jpg',
         vin1=(-2.15, 2.11), vout=(2.87, 7.21),
         theory=lambda v: v + VIN2_DC),
    dict(key='exp3', sheet='實驗三 減法器', row=16, vout_col=4,
         title='the subtracting amplifier circuit configuration of an op-amp',
         zh='實驗三　減法器', img='lab5-exp3-scope.jpg',
         vin1=(-5.4, 5.2), vout=(-10.3, 0.2),
         theory=lambda v: v - VIN2_DC),
]


def fmt(v):
    """−2.17 → '-2.17'；整數位數跟著原始讀值的位數走。"""
    s = f'{v:.2f}'.rstrip('0').rstrip('.')
    return s if s not in ('-0', '') else '0'


def rng(lo, hi):
    return f'{fmt(lo)}~{fmt(hi)}V'


def set_borders(table):
    tbl = table._tbl
    pr = tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement(f'w:{edge}')
        e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '6')
        e.set(qn('w:space'), '0'); e.set(qn('w:color'), '000000')
        borders.append(e)
    pr.append(borders)


def fix_layout(table):
    pr = table._tbl.tblPr
    el = OxmlElement('w:tblLayout'); el.set(qn('w:type'), 'fixed')
    pr.append(el)


def no_split(table):
    """整張表不要被分頁從中間切開。"""
    for row in table.rows:
        trPr = row._tr.get_or_add_trPr()
        el = OxmlElement('w:cantSplit')
        trPr.append(el)


def set_grid(table, widths_cm):
    """固定版面下 Word 與 LibreOffice 都以 w:tblGrid 為準，cell.width 改不動欄寬。"""
    tbl = table._tbl
    grid = tbl.find(qn('w:tblGrid'))
    for gc in list(grid):
        grid.remove(gc)
    for cm in widths_cm:
        gc = OxmlElement('w:gridCol')
        gc.set(qn('w:w'), str(int(round(cm * 567))))
        grid.append(gc)
    pr = tbl.tblPr
    w = pr.find(qn('w:tblW'))
    if w is None:
        w = OxmlElement('w:tblW'); pr.append(w)
    w.set(qn('w:w'), str(int(round(sum(widths_cm) * 567)))); w.set(qn('w:type'), 'dxa')


def set_w(cell, cm):
    cell.width = Cm(cm)
    tcW = cell._tc.get_or_add_tcPr().find(qn('w:tcW'))
    if tcW is None:
        tcW = OxmlElement('w:tcW'); cell._tc.get_or_add_tcPr().append(tcW)
    tcW.set(qn('w:w'), str(int(cm * 567))); tcW.set(qn('w:type'), 'dxa')


def cell_text(cell, text, *, bold=False, size=10.5):
    cell.text = ''
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.bold = bold
    r.font.size = Pt(size)
    r.font.name = 'Times New Roman'
    r.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), '微軟正黑體')
    pf = p.paragraph_format
    pf.space_before = Pt(1); pf.space_after = Pt(1)


def build_table(doc, exp):
    """3 欄的格線撐出兩種分割：波形那列是 2.4 / 13.0，資料列是 6.5 / 8.9（合併後）。"""
    W = (2.4, 4.1, 8.9)                      # 合計 15.4 cm
    t = doc.add_table(rows=9, cols=3)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    set_borders(t)
    fix_layout(t)
    set_grid(t, W)
    no_split(t)

    for r in (0, 1, 5, 6, 7, 8):             # 整列合併
        t.cell(r, 0).merge(t.cell(r, 1)).merge(t.cell(r, 2))
    t.cell(2, 1).merge(t.cell(2, 2))         # 波形：2.4 / 13.0
    t.cell(3, 0).merge(t.cell(3, 1))         # 資料列：6.5 / 8.9
    t.cell(4, 0).merge(t.cell(4, 1))

    for r in (0, 1, 5, 6, 7, 8):
        set_w(t.cell(r, 0), sum(W))
    set_w(t.cell(2, 0), W[0]); set_w(t.cell(2, 1), W[1] + W[2])
    for r in (3, 4):
        set_w(t.cell(r, 0), W[0] + W[1]); set_w(t.cell(r, 2), W[2])

    cell_text(t.cell(0, 0), exp['title'])
    cell_text(t.cell(1, 0), 'Input & output waveform')

    cell_text(t.cell(2, 0), 'Waveform')
    p = t.cell(2, 1).paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    p.add_run().add_picture(os.path.join(IMG_DIR, exp['img']), width=Cm(12.4))

    lo1, hi1 = exp['vin1']
    o_lo, o_hi = exp['vout']                 # 對應 V_in1 波谷 / 波峰
    th = (exp['theory'](lo1), exp['theory'](hi1))

    cell_text(t.cell(3, 0), 'Vin1-pp (波峰波谷)')
    cell_text(t.cell(3, 2), 'Vin2-pp')
    cell_text(t.cell(4, 0), rng(lo1, hi1))
    cell_text(t.cell(4, 2), f'{fmt(VIN2_DC)}V（直流）')
    cell_text(t.cell(5, 0), 'Output voltage (theoretical calculation)')
    cell_text(t.cell(6, 0), rng(*th))
    cell_text(t.cell(7, 0), 'Output voltage (experimental calculation)')
    cell_text(t.cell(8, 0), rng(o_lo, o_hi))
    return t


def check_against_xlsx(exp):
    """波峰−波谷 要和記錄簿的實測 V_pp 對得上，否則兩邊有一處抄錯。"""
    wb = load_workbook(XLSX, data_only=True)
    ws = wb[exp['sheet']]
    vin1 = ws.cell(row=exp['row'], column=2).value
    vout = ws.cell(row=exp['row'], column=exp['vout_col']).value
    got1 = abs(exp['vin1'][1] - exp['vin1'][0])
    got2 = abs(exp['vout'][1] - exp['vout'][0])
    for name, a, b in (('V_in1', got1, vin1), ('V_out', got2, vout)):
        if b is None:
            sys.exit(f"{exp['sheet']} 的 {name} 在 xlsx 裡是空的，先把記錄簿填好。")
        if abs(a - float(b)) > 0.011:
            sys.exit(f"{exp['sheet']} 的 {name} 對不上：照片算出 {a:.2f} V_pp，xlsx 寫 {b} V_pp。")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--date', default='2026-11-21')
    ap.add_argument('-o', '--out')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    out = args.out or os.path.join(OUT_DIR, f'{args.id}_{args.name}_Lab 5 實驗數據結果.docx')
    if os.path.exists(out) and not args.force:
        sys.exit(f'{out} 已存在，加 --force 覆寫或用 -o 另存。')

    for exp in EXPS:
        check_against_xlsx(exp)

    doc = Document()
    z = doc.settings.element.find(qn('w:zoom'))
    if z is not None and z.get(qn('w:percent')) is None:
        z.set(qn('w:percent'), '100')
    st = doc.styles['Normal']
    st.font.name = 'Times New Roman'; st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), '微軟正黑體')
    for s in doc.sections:
        s.page_width, s.page_height = Cm(21.0), Cm(29.7)      # A4，不要用 python-docx 預設的 Letter
        s.left_margin = s.right_margin = Cm(2.0)
        s.top_margin = s.bottom_margin = Cm(1.6)

    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run('Lab 5 Summing & Subtracting Amplifier：實驗數據結果')
    r.bold = True; r.font.size = Pt(16)
    r.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), '微軟正黑體')
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(f'學號 {args.id}　姓名 {args.name}　量測日期 {args.date}')
    r.font.size = Pt(10.5)
    r.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), '微軟正黑體')

    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(
        '儀器：GW Instek GPE-3323 直流電源供應器（CH1／CH2 串聯追蹤做 ±15 V、CH3 固定 +5 V）、'
        'Keysight EDUX1052G 數位示波器（內建 Gen Out 當訊號源）、GW Instek GDM-532 三用電表、麵包板；'
        '元件：uA741、10 kΩ 電阻（實驗一 3 顆，實驗二、三 4 顆）。'
        'Vin1 為 Gen Out 的 100 Hz 正弦波，Vin2 為 CH3 的 +5 V 直流，示波器兩通道皆直流耦合。'
        '理論值依各電路的關係式逐點計算：實驗一 Vout = −(Vin1 + Vin2)、實驗二 Vout = Vin1 + Vin2、實驗三 Vout = Vin1 − Vin2。')
    r.font.size = Pt(9)
    r.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), '微軟正黑體')

    for i, exp in enumerate(EXPS):
        if i:                                  # 一頁一個實驗，表格不會被分頁切開
            doc.add_page_break()
        q = doc.add_paragraph(); q.alignment = WD_ALIGN_PARAGRAPH.LEFT
        rr = q.add_run(exp['zh']); rr.bold = True; rr.font.size = Pt(11)
        rr.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), '微軟正黑體')
        q.paragraph_format.space_before = Pt(8); q.paragraph_format.space_after = Pt(2)
        build_table(doc, exp)

    doc.save(out)
    print('已輸出', out)

    subprocess.run(['soffice', '--headless', '--convert-to', 'pdf',
                    '--outdir', OUT_DIR, out], check=True, capture_output=True)
    pdf = os.path.splitext(out)[0] + '.pdf'
    print('已輸出', pdf)


if __name__ == '__main__':
    main()
