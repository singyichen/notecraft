#!/usr/bin/env python3
"""Lab 1 實驗數據結果（當天上傳用）：把 measured/Lab1-數據記錄.xlsx 實驗一、二的實測數據、
對照圖與現場照片排成一份 .docx。

- 數據直接讀 xlsx 的快取值（Excel 存檔後才有），不重算。
- 圖用 matplotlib 依 xlsx 同一組資料重畫（xlsx 的圖抽不出來），版面與工作表的圖一致。
- 照片放在 <notesDir>/_outputs/lab1/photos/（不進版控），用 --photos 指定別的資料夾。

用法：cd simulations/lab1 && .venv/bin/python report/build_lab1_data_results.py --id 515661055 --name 陳欣怡
"""
import argparse
import os
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from openpyxl import load_workbook

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'tools'))
from lab_report import add_runs   # $LaTeX$ → Word 原生方程式

HERE = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.abspath(os.path.join(HERE, '..'))
ROOT = os.path.abspath(os.path.join(LAB, '..', '..'))
XLSX = os.path.join(LAB, 'measured', 'Lab1-數據記錄.xlsx')
OUT_DIR = os.path.join(ROOT, 'src', 'content', 'notes', '_outputs', 'lab1')

plt.rcParams.update({'font.family': ['Heiti TC', 'Hiragino Sans', 'Arial Unicode MS', 'Arial', 'sans-serif'],
                     'font.size': 10, 'axes.unicode_minus': False})
INK, MEAS, LT, DS = '#1F2937', '#1F4E79', '#BE4B48', '#4E8F3A'

PHOTOS = {  # 檔名 → 圖說
    'exp1': [('順向全面.jpg', '實驗一量測現場：直流電源供應器 GPE-3323、麵包板、三用電表 GDM-532 與記錄用筆電'),
             ('順向.jpg', '實驗一接線：電源正極經跳線接 D1 1N4007 陽極，陰極串 1 kΩ 回到負極')],
    'exp2': [('逆向全面.jpg', '實驗二量測現場：電源電壓提高到 1–20 V，電流表改用 µA 檔'),
             ('逆向.jpg', '實驗二接線：D1 反接（色環朝電源正極），其餘與實驗一相同')],
}


# ── 讀 xlsx ─────────────────────────────────────────────────────────────────
def read_rows(ws, ncol, r0=7, r1=26):
    rows = []
    for r in range(r0, r1 + 1):
        v = [ws.cell(row=r, column=c).value for c in range(1, ncol + 1)]
        if v[0] is None:
            continue
        rows.append(v)
    return rows


def num(v, fmt):
    if v is None or v == '':
        return ''
    try:
        return fmt % float(v)
    except (TypeError, ValueError):
        return str(v)


# ── 畫圖（與工作表上的四張圖同一組資料） ────────────────────────────────────
def fig_exp1(rows, out):
    vs = [r[0] for r in rows]
    vd = [r[1] for r in rows]
    i = [r[2] for r in rows]
    lvd = [r[6] for r in rows]
    li = [r[7] for r in rows]
    fig, (a, b) = plt.subplots(1, 2, figsize=(9.2, 3.6))
    a.plot(lvd, li, color=LT, lw=1.6, label='LTspice 1N4007（預報）')
    a.scatter(vd, i, s=28, color=MEAS, zorder=3, label='實測（電表）')
    a.set_xlabel('$V_D$ (V)'); a.set_ylabel('$I$ (mA)'); a.set_title('實驗一 I-V 特性曲線：實測 vs LTspice 預報', fontsize=10.5)
    a.grid(alpha=.3); a.legend(fontsize=8.5, loc='upper left')
    b.plot(vs, lvd, color=LT, lw=1.6, label='LTspice')
    b.scatter(vs, vd, s=28, color=MEAS, zorder=3, label='實測')
    b.set_xlabel('$V_s$ (V)'); b.set_ylabel('$V_D$ (V)'); b.set_title('實驗一 $V_D$ 對 $V_s$：過了導通電壓就幾乎不再上升', fontsize=10.5)
    b.grid(alpha=.3); b.legend(fontsize=8.5, loc='lower right')
    fig.tight_layout(); fig.savefig(out, dpi=200); plt.close(fig)


def fig_exp2(rows, out):
    vs = [r[0] for r in rows]
    vd = [r[1] for r in rows]
    i = [r[2] for r in rows]
    lvd = [r[4] for r in rows]
    li = [r[6] for r in rows]
    ds = [r[7] for r in rows]
    fig, (a, b) = plt.subplots(1, 2, figsize=(9.2, 3.6))
    a.plot(vs, lvd, color=LT, lw=1.6, label='LTspice')
    a.scatter(vs, vd, s=28, color=MEAS, zorder=3, label='實測')
    a.set_xlabel('$V_s$ (V)'); a.set_ylabel('$V_D$ (V)'); a.set_title('實驗二 $V_D$ 對 $V_s$：逆偏時 $V_D$ 幾乎等於 $V_s$', fontsize=10.5)
    a.grid(alpha=.3); a.legend(fontsize=8.5, loc='upper left')
    b.plot(vs, ds, color=DS, lw=1.4, ls='--', label='datasheet 上限 5 µA')
    b.plot(vs, li, color=LT, lw=1.6, label='LTspice 1N4007')
    b.scatter(vs, i, s=28, color=MEAS, zorder=3, label='實測')
    b.set_xlabel('$V_s$ (V)'); b.set_ylabel('$I$ (µA)'); b.set_title('實驗二 漏電流對 $V_s$：實測、LTspice 與 datasheet 上限', fontsize=10.5)
    b.set_yscale('symlog', linthresh=1e-3); b.grid(alpha=.3, which='both'); b.legend(fontsize=8.5, loc='center right')
    fig.tight_layout(); fig.savefig(out, dpi=200); plt.close(fig)


# ── docx 小工具 ─────────────────────────────────────────────────────────────
def set_cell_bg(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)


def table(doc, header, rows, widths_cm, font_pt=9):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(header):
        c = t.rows[0].cells[i]
        c.text = ''
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(p, h, size=font_pt, bold=True)
        set_cell_bg(c, 'D9E2F3')
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ''
            p = cells[i].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(v); run.font.size = Pt(font_pt)
    for row in t.rows:
        for i, w in enumerate(widths_cm):
            row.cells[i].width = Cm(w)
    return t


def caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_runs(p, text, size=9, color=RGBColor(0x59, 0x59, 0x59))
    p.paragraph_format.space_after = Pt(8)


def photo(doc, path, cap, width_cm=15.5, tmpdir=None):
    """照片縮到 1600px 寬再放進 docx，免得四張原圖撐到十幾 MB。"""
    im = Image.open(path)
    im = im.convert('RGB')
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    small = os.path.join(tmpdir, os.path.basename(path).rsplit('.', 1)[0] + '-small.jpg')
    im.save(small, quality=85)
    doc.add_picture(small, width=Cm(width_cm))
    doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption(doc, cap)


def heading(doc, text, level):
    h = doc.add_heading(text, level=level)
    for r in h.runs:
        r.font.color.rgb = RGBColor(0x1F, 0x2E, 0x4D)
    return h


# ── 主程式 ──────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--date', default='2026-10-03')
    ap.add_argument('--photos', default=os.path.join(OUT_DIR, 'photos'))
    ap.add_argument('-o', '--out')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    out = args.out or os.path.join(OUT_DIR, f'{args.id}_{args.name}_Lab 1 實驗數據結果.docx')
    if os.path.exists(out) and not args.force:
        sys.exit(f'{out} 已存在，加 --force 覆寫或用 -o 另存。')
    build = os.path.join(HERE, 'build'); os.makedirs(build, exist_ok=True)

    wb = load_workbook(XLSX, data_only=True)
    e1 = read_rows(wb['實驗一 順偏'], 9)
    e2 = read_rows(wb['實驗二 逆偏'], 8)
    if any(r[1] is None for r in e1) or any(r[1] is None for r in e2):
        print('警告：有實測欄是空的（xlsx 要先在 Excel 存檔，公式才有快取值）', file=sys.stderr)
    f1 = os.path.join(build, 'data-exp1.png'); fig_exp1(e1, f1)
    f2 = os.path.join(build, 'data-exp2.png'); fig_exp2(e2, f2)

    doc = Document()
    z = doc.settings.element.find(qn('w:zoom'))      # python-docx 預設範本少了 w:percent，XSD 驗證會抱怨
    if z is not None and z.get(qn('w:percent')) is None:
        z.set(qn('w:percent'), '100')
    st = doc.styles['Normal']; st.font.name = 'Arial'; st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), '微軟正黑體')
    for name in ('Heading 1', 'Heading 2'):
        hs = doc.styles[name]; hs.font.name = 'Arial'
        hs.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), '微軟正黑體')
    for s in doc.sections:
        s.left_margin = s.right_margin = Cm(2); s.top_margin = s.bottom_margin = Cm(2)

    t = doc.add_paragraph(); t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = t.add_run('Lab 1 Diode：實驗數據結果'); r.bold = True; r.font.size = Pt(18)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(f'學號 {args.id}　姓名 {args.name}　量測日期 {args.date}').font.size = Pt(11)
    p = doc.add_paragraph()
    p.add_run('儀器：直流電源供應器 GW Instek GPE-3323、三用電表 GW Instek GDM-532、麵包板；元件：1N4007、1 kΩ（實測 999 Ω）。'
              '數據與圖同步自當天記錄簿 Lab1-數據記錄.xlsx；預報值為 LTspice 以 1N4007 真實模型的模擬結果。').font.size = Pt(10)

    # 實驗一
    heading(doc, '實驗一：順偏導通電壓（Forward Bias: Knee Voltage）', 1)
    add_runs(doc.add_paragraph(), '電路：$V_s$ 正極 → D1 陽極，D1 陰極 → $R = 1\\ \\text{k}\\Omega$ → 負極；電壓表跨 D1 兩端量 $V_D$，'
             '再跨 R 兩端量 $V_R$ 換算 $I=\\frac{V_R}{999\\ \\Omega}$。$V_s$ 由 0.1 V 每次加 0.1 V 掃到 2.0 V。')
    for fn, cap in PHOTOS['exp1']:
        photo(doc, os.path.join(args.photos, fn), cap, tmpdir=build)
    heading(doc, '量測數據', 2)
    hdr = ['$V_s$ (V)', '實測 $V_D$ (V)', '實測 $I$ (mA)', '$V_R = V_s - V_D$ (V)', '$I=\\frac{V_R}{R}$ (mA)', '電表 vs 計算 差異',
           'LTspice $V_D$ (V)', 'LTspice $I$ (mA)', '$V_D$ 誤差']
    rows = [[num(r[0], '%.2f'), num(r[1], '%.3f'), num(r[2], '%.4f'), num(r[3], '%.3f'), num(r[4], '%.4f'),
             num(r[5] * 100 if r[5] not in (None, '') else '', '%.1f%%'), num(r[6], '%.3f'), num(r[7], '%.4f'),
             num(r[8] * 100 if r[8] not in (None, '') else '', '%.1f%%')] for r in e1]
    table(doc, hdr, rows, [1.4, 1.9, 1.9, 2.3, 2.1, 1.9, 2.0, 1.9, 1.6], font_pt=8.5)
    caption(doc, '表 1　實驗一順偏 I-V 記錄：黃底欄為實測，其餘由 xlsx 公式與 LTspice 預報帶出')
    doc.add_picture(f1, width=Cm(16.5)); doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption(doc, '圖 1　左：I-V 特性曲線，實測點疊在 LTspice 1N4007 預報曲線上；右：$V_D$ 隨 $V_s$ 的變化')

    # 實驗二
    heading(doc, '實驗二：逆偏（Reverse Bias）', 1)
    add_runs(doc.add_paragraph(), '電路同實驗一，D1 反接（陰極接電源正極）。$V_s$ 由 1 V 每次加 1 V 掃到 20 V，電流同樣由 $V_R$（mV 檔）換算。')
    for fn, cap in PHOTOS['exp2']:
        photo(doc, os.path.join(args.photos, fn), cap, tmpdir=build)
    heading(doc, '量測數據', 2)
    hdr = ['$V_s$ (V)', '實測 $V_D$ (V)', '實測 $I$ (µA)', '$V_s - V_D$ (V)', 'LTspice $V_D$ (V)', 'LTspice $I$ (nA)', 'LTspice $I$ (µA)', 'datasheet 上限 (µA)']
    rows = [[num(r[0], '%.0f'), num(r[1], '%.3f'), num(r[2], '%.5f'), num(r[3], '%.3f'), num(r[4], '%.3f'),
             num(r[5], '%.3f'), num(r[6], '%.6f'), num(r[7], '%.1f')] for r in e2]
    table(doc, hdr, rows, [1.4, 2.0, 2.0, 2.0, 2.1, 2.0, 2.1, 2.4], font_pt=8.5)
    caption(doc, '表 2　實驗二逆偏記錄：$V_s - V_D$ 接近 0 代表電源電壓幾乎全落在二極體上')
    doc.add_picture(f2, width=Cm(16.5)); doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption(doc, '圖 2　左：逆偏時 $V_D$ 隨 $V_s$ 一比一上升；右：漏電流對 $V_s$（對數軸），與 LTspice 預報及 datasheet 5 µA 上限對照')

    os.makedirs(os.path.dirname(out), exist_ok=True)
    doc.save(out)
    print('wrote', out, f'{os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
