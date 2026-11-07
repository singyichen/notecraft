#!/usr/bin/env python3
"""Lab 3 實驗數據結果（當天上傳用）：把 measured/Lab3-數據記錄.xlsx 實驗一、二的實測數據、
對照圖與現場照片排成一份 .docx，版面照 Lab 2 的「實驗數據結果」。

- 數據直接讀 xlsx 的快取值（Excel 存檔後才有），不重算。
- 圖用 matplotlib 依 xlsx 同一組資料重畫（xlsx 的圖抽不出來），版面與工作表的圖一致。
- 照片放在 <notesDir>/_outputs/lab3/photos/（不進版控），用 --photos 指定別的資料夾。
- 當天只做了必做的實驗一、二；實驗三、四與第二部分沒做，本檔不輸出那幾節。

用法：cd simulations/lab3 && ../lab1/.venv/bin/python report/build_lab3_data_results.py --id 515661055 --name 陳欣怡
"""
import argparse
import math
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
XLSX = os.path.join(LAB, 'measured', 'Lab3-數據記錄.xlsx')
OUT_DIR = os.path.join(ROOT, 'src', 'content', 'notes', '_outputs', 'lab3')

plt.rcParams.update({'font.family': ['Heiti TC', 'Hiragino Sans', 'Arial Unicode MS', 'Arial', 'sans-serif'],
                     'font.size': 10, 'axes.unicode_minus': False})
INK, LT = '#1F2937', '#BE4B48'
# 四／三組掃描各自的顏色
G4 = ['#9CA3AF', '#2E86DE', '#E67E22', '#1F4E79']
G3 = ['#2E86DE', '#E67E22', '#1F4E79']

VGS_GROUPS = [0, 2, 4, 6]      # 實驗一：閘極電源設定
VDS_GROUPS = [1, 3, 5]         # 實驗二：汲極電源設定

PHOTOS = {
    'exp1': [('實驗一全面.jpg', '實驗一量測現場：直流電源供應器 GPE-3323 雙路輸出（CH1 給閘極、CH2 給汲極，兩路負端共地）、'
                               '麵包板、三用電表 GDM-532 與記錄用筆電'),
             ('實驗一麵包板.jpg', '實驗一接線：閘極由跳線接 CH1，汲極以跳線接 CH2，源極串 $R_1 = 1\\ \\text{k}\\Omega$（藍色色環）'
                                 '回到共同負端；電表跨在 $R_1$ 兩端量 $V_{R_1}$')],
    'exp2': [('實驗二全面.jpg', '實驗二量測現場：同一組儀器，CH1 改掃閘極電壓 0～5 V、CH2 固定在 1／3／5 V'),
             ('實驗二麵包板.jpg', '實驗二接線：源極直接接地，汲極串 $R_1 = 100\\ \\Omega$（藍色色環）接到 CH2，'
                                 '閘極由跳線接 CH1；電表跨在 $R_1$ 兩端量 $V_{R_1}$')],
}


# ── 讀 xlsx ─────────────────────────────────────────────────────────────────
def cell(ws, r, c):
    return ws.cell(row=r, column=c).value


def read_exp1(ws):
    """回傳 [(V_DS設定, [(V_R1, I_D, V_GS元件, V_DS元件, LT_I_D, LT_V_DS, LT_V_GS, 偏差)] × 4組), ...]"""
    rows = []
    for r in range(8, 39):                      # V_DS 設定 0 → 15 V，每 0.5 V
        v = cell(ws, r, 1)
        if v is None:
            continue
        groups = []
        for g in range(4):
            c0 = 2 + g * 8
            groups.append(tuple(cell(ws, r, c0 + k) for k in range(8)))
        rows.append((float(v), groups))
    return rows


def read_exp2(ws):
    """回傳 [(V_GS設定, [(實測壓降, I_D, LT_I_D, LT_V_D, 偏差)] × 3組), ...]"""
    rows = []
    for r in range(8, 19):                      # V_GS 設定 0 → 5 V，每 0.5 V
        v = cell(ws, r, 1)
        if v is None:
            continue
        groups = []
        for g in range(3):
            c0 = 2 + g * 6
            groups.append((cell(ws, r, c0), cell(ws, r, c0 + 2), cell(ws, r, c0 + 3),
                           cell(ws, r, c0 + 4), cell(ws, r, c0 + 5)))
        rows.append((float(v), groups))
    return rows


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def num(v, fmt):
    f = fnum(v)
    return '' if f is None else fmt % f


# ── 畫圖 ────────────────────────────────────────────────────────────────────
def series(rows, g, idx):
    """抓第 g 組第 idx 欄有值的 (x, y)；x 一律是第一欄的電源設定值。"""
    xs, ys = [], []
    for x, groups in rows:
        y = fnum(groups[g][idx])
        if y is None:
            continue
        xs.append(x); ys.append(y)
    return xs, ys


def pairs(rows, g, ix, iy):
    xs, ys = [], []
    for _, groups in rows:
        a, b = fnum(groups[g][ix]), fnum(groups[g][iy])
        if a is None or b is None:
            continue
        xs.append(a); ys.append(b)
    return xs, ys


def fig_exp1(rows, out):
    fig, (a, b) = plt.subplots(1, 2, figsize=(9.2, 3.6))
    for g, vgs in enumerate(VGS_GROUPS):
        mx, my = series(rows, g, 1)                     # 實測 I_D
        a.scatter(mx, my, s=22, color=G4[g], zorder=3, label=f'$V_{{GS}}$ 設定 = {vgs} V')
    a.set_xlabel('$V_{DS}$ 電源設定 (V)'); a.set_ylabel('$I_D$ (mA)')
    a.set_title('實驗一 $I_D$–$V_{DS}$ 實測點', fontsize=10)
    a.set_xlim(-0.3, 10.8); a.grid(alpha=.3)
    a.legend(fontsize=8, loc='center right', framealpha=.92)

    for g, vgs in enumerate(VGS_GROUPS):
        mx, my = series(rows, g, 2)                     # 實測：元件端 V_GS
        b.scatter(mx, my, s=22, color=G4[g], zorder=3, label=f'$V_{{GS}}$ 設定 = {vgs} V')
    b.set_xlabel('$V_{DS}$ 電源設定 (V)'); b.set_ylabel('$V_{GS}$ 元件端 (V)')
    b.set_title('掃描過程中元件真正的 $V_{GS}$ 一路往下掉', fontsize=10)
    b.set_xlim(-0.3, 10.8); b.grid(alpha=.3)
    b.legend(fontsize=8, loc='center right', framealpha=.92)
    fig.tight_layout(); fig.savefig(out, dpi=200); plt.close(fig)


def fig_exp1_device(rows, out):
    fig, ax = plt.subplots(figsize=(6.0, 3.6))
    for g, vgs in enumerate(VGS_GROUPS):
        mx, my = pairs(rows, g, 3, 1)                   # 實測：元件端 V_DS vs I_D
        ax.scatter(mx, my, s=22, color=G4[g], zorder=3, label=f'$V_{{GS}}$ 設定 = {vgs} V')
    ax.set_xlabel('$V_{DS}$ 元件端 (V)'); ax.set_ylabel('$I_D$ (mA)')
    ax.set_title('同一組數據換成元件端橫軸：自偏壓軌跡', fontsize=10)
    ax.set_xlim(-0.4, 9.2); ax.grid(alpha=.3)
    ax.legend(fontsize=8, loc='lower right', framealpha=.92)
    fig.tight_layout(); fig.savefig(out, dpi=200); plt.close(fig)


def fig_exp2(rows, out):
    fig, (a, b) = plt.subplots(1, 2, figsize=(9.2, 3.6))
    for g, vds in enumerate(VDS_GROUPS):
        mx, my = series(rows, g, 1)
        a.scatter(mx, my, s=22, color=G3[g], zorder=3, label=f'$V_{{DS}}$ 設定 = {vds} V')
    a.set_xlabel('$V_{GS}$ (V)'); a.set_ylabel('$I_D$ (mA)')
    a.set_title('實驗二 $I_D$–$V_{GS}$ 實測點', fontsize=10)
    a.grid(alpha=.3); a.legend(fontsize=8, loc='upper left', framealpha=.92)

    for g, vds in enumerate(VDS_GROUPS):
        mx, my = series(rows, g, 1)
        b.scatter(mx, [math.sqrt(y) if y >= 0 else 0 for y in my], s=22, color=G3[g], zorder=3,
                  label=f'$V_{{DS}}$ 設定 = {vds} V')
    b.set_xlabel('$V_{GS}$ (V)'); b.set_ylabel(r'$\sqrt{I_D}$ ($\sqrt{\mathrm{mA}}$)')
    b.set_title(r'$\sqrt{I_D}$–$V_{GS}$：粗掃在抬頭段只落得到一兩個點', fontsize=10)
    b.set_xlim(1.5, 5.2); b.grid(alpha=.3)
    b.legend(fontsize=8, loc='lower right', framealpha=.92)
    fig.tight_layout(); fig.savefig(out, dpi=200); plt.close(fig)


# ── docx 小工具 ─────────────────────────────────────────────────────────────
def set_cell_bg(cell_, hex_color):
    tcPr = cell_._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), hex_color)
    tcPr.append(shd)


def table(doc, header, rows, widths_cm, font_pt=8.5, group_row=None):
    """group_row：[(文字, 跨幾欄), ...]，給多組掃描共用一條欄名列時當第二層表頭。"""
    t = doc.add_table(rows=1, cols=len(header))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    if group_row:
        cells = t.rows[0].cells
        i = 0
        for text, span in group_row:
            c = cells[i]
            if span > 1:
                c = c.merge(cells[i + span - 1])
            c.text = ''
            p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            add_runs(p, text, size=font_pt, bold=True)
            set_cell_bg(c, 'BDD7EE')
            i += span
        cells = t.add_row().cells
    else:
        cells = t.rows[0].cells
    for i, h in enumerate(header):
        c = cells[i]
        c.text = ''
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(p, h, size=font_pt, bold=True)
        set_cell_bg(c, 'D9E2F3')
    for row in rows:
        cs = t.add_row().cells
        for i, v in enumerate(row):
            cs[i].text = ''
            p = cs[i].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(v); run.font.size = Pt(font_pt)
    for row in t.rows:
        for i, w in enumerate(widths_cm):
            if i < len(row.cells):
                row.cells[i].width = Cm(w)
    return t


def caption(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_runs(p, text, size=9, color=RGBColor(0x59, 0x59, 0x59))
    p.paragraph_format.space_after = Pt(8)


def photo(doc, path, cap, width_cm=15.5, tmpdir=None):
    """照片縮到 1600px 寬再放進 docx，免得四張原圖撐到十幾 MB。"""
    im = Image.open(path).convert('RGB')
    if im.width > 1600:
        im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    small = os.path.join(tmpdir, os.path.basename(path).rsplit('.', 1)[0] + '-small.jpg')
    im.save(small, quality=85)
    doc.add_picture(small, width=Cm(width_cm))
    doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption(doc, cap)


def heading(doc, text, level):
    """標題也走 add_runs，$...$ 才會變成 Word 方程式（add_heading 只收純文字）。"""
    h = doc.add_heading('', level=level)
    add_runs(h, text, size=15 if level == 1 else 12.5, bold=True,
             color=RGBColor(0x1F, 0x2E, 0x4D))
    return h


def para(doc, text, size=10.5):
    return add_runs(doc.add_paragraph(), text, size=size)


PLATEAU_RATIO = 0.7      # I_D 超過「平台高度 × 這個比例」就當作已被 R1 限流，不取（與記錄簿同一條規則）


def two_point_vth(rows, g, plateau):
    """用粗掃抬頭段最低的兩個點做平方根外插；回傳 (V_GS1, I_D1, V_GS2, I_D2, V_th) 或 None。
    已被 R1 限流（I_D 超過平台高度的 PLATEAU_RATIO）的點不是平方律段，一律排除。"""
    pts = [(v, fnum(gr[g][1])) for v, gr in rows]
    pts = [(v, i) for v, i in pts if i is not None and 0 < i <= plateau * PLATEAU_RATIO]
    if len(pts) < 2:
        return None
    (v1, i1), (v2, i2) = pts[0], pts[1]
    s1, s2 = math.sqrt(i1), math.sqrt(i2)
    if s2 == s1:
        return None
    return v1, i1, v2, i2, v1 - (v2 - v1) / (s2 - s1) * s1


# ── 主程式 ──────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True)
    ap.add_argument('--name', required=True)
    ap.add_argument('--date', default='2026-11-07')
    ap.add_argument('--photos', default=os.path.join(OUT_DIR, 'photos'))
    ap.add_argument('-o', '--out')
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()

    out = args.out or os.path.join(OUT_DIR, f'{args.id}_{args.name}_Lab 3 實驗數據結果.docx')
    if os.path.exists(out) and not args.force:
        sys.exit(f'{out} 已存在，加 --force 覆寫或用 -o 另存。')
    build = os.path.join(HERE, 'build'); os.makedirs(build, exist_ok=True)

    wb = load_workbook(XLSX, data_only=True)
    ws1, ws2 = wb['實驗一 特性曲線'], wb['實驗二 轉移曲線']
    r1_exp1 = fnum(cell(ws1, 4, 2)) or 1000.0
    r1_exp2 = fnum(cell(ws2, 4, 2)) or 100.0
    e1 = read_exp1(ws1)
    e2 = read_exp2(ws2)
    if not any(fnum(g[0]) is not None for _, gs in e1 for g in gs):
        print('警告：實驗一沒有任何實測值（xlsx 要先在 Excel 存檔，公式才有快取值）', file=sys.stderr)

    e1_meas = [(v, gs) for v, gs in e1 if any(fnum(g[0]) is not None for g in gs)]
    vmax = max(v for v, _ in e1_meas)

    f1 = os.path.join(build, 'data-exp1.png'); fig_exp1(e1, f1)
    f1b = os.path.join(build, 'data-exp1-device.png'); fig_exp1_device(e1, f1b)
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
        s.left_margin = s.right_margin = Cm(1.8); s.top_margin = s.bottom_margin = Cm(2)

    t = doc.add_paragraph(); t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = t.add_run('Lab 3 MOSFET：實驗數據結果'); r.bold = True; r.font.size = Pt(18)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run(f'學號 {args.id}　姓名 {args.name}　量測日期 {args.date}').font.size = Pt(11)
    para(doc, '儀器：直流電源供應器 GW Instek GPE-3323（雙路輸出，兩路負端共地）、三用電表 GW Instek GDM-532、麵包板。'
              f'元件：2N7000（TO-92）、取樣電阻 $R_1$（實驗一 ${r1_exp1:g}\\ \\Omega$，實驗二 ${r1_exp2:g}\\ \\Omega$）。'
              '電流一律由 $R_1$ 的壓降換算：$I_D = V_{R_1}/R_1$。本次完成實驗一、二，其餘未做。', size=10)

    # ── 實驗一 ──────────────────────────────────────────────────────────────
    heading(doc, '實驗一：輸出特性曲線 $I_D$–$V_{DS}$（Output Characteristic Curve）', 1)
    para(doc, f'電路：閘極接 CH1、汲極接 CH2，源極經 $R_1 = {r1_exp1:g}\\ \\Omega$ 回到共同負端。'
              f'四組閘極電源設定（0、2、4、6 V）各自把汲極電源由 0 V 每次加 0.5 V 掃到 {vmax:g} V。')
    for fn, cap in PHOTOS['exp1']:
        photo(doc, os.path.join(args.photos, fn), cap, tmpdir=build)

    heading(doc, '量測數據', 2)
    para(doc, '源極串了 $R_1$，元件端電壓要減掉它：$V_{GS} = V_{GS,\\text{設定}} - V_{R_1}$、'
              '$V_{DS} = V_{DS,\\text{設定}} - V_{R_1}$。', size=10)
    hdr = ['$V_{DS}$ 設定 (V)'] + ['實測 $V_{R_1}$ (V)', '$I_D$ (mA)'] * 4
    grp = [('', 1)] + [(f'$V_{{GS}}$ 設定 = {v} V', 2) for v in VGS_GROUPS]
    rows = []
    for v, gs in e1_meas:
        row = [f'{v:g}']
        for g in gs:
            row += [num(g[0], '%.3f'), num(g[1], '%.3f')]
        rows.append(row)
    table(doc, hdr, rows, [1.9] + [1.9] * 8, font_pt=8.5, group_row=grp)
    caption(doc, f'表 1　實驗一記錄（$V_{{DS}}$ 電源 0～{vmax:g} V，每 0.5 V 共 {len(rows)} 點）。'
                 f'$R_1$ 為 1 k$\\Omega$，故 $I_D$ 的毫安值與 $V_{{R_1}}$ 的伏特值相同')

    doc.add_picture(f1, width=Cm(17.0)); doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption(doc, '圖 1　左：以電源設定值為橫軸的 $I_D$–$V_{DS}$ 實測點；'
                 '右：元件端 $V_{GS}$ 沿掃描的漂移')
    para(doc, '4 V 組約在 $V_{DS}$ 設定 2.5 V 轉平、平台 1.69～1.78 mA；6 V 組約在 5.5 V 轉平、'
              '平台 3.77～3.96 mA。0 V 組全程 0.000 V（截止），2 V 組 0.07～0.12 mA（微導通）。', size=10)

    heading(doc, '元件端換算', 2)
    para(doc, '源極電位隨電流抬高，所以元件端 $V_{GS}$ 沿掃描一路下降（圖 1 右，6 V 組由 6 V 掉到約 2.0 V）。'
              '換成元件端橫軸的圖 2 因此是自偏壓軌跡，不是固定 $V_{GS}$ 的輸出特性曲線。', size=10)
    doc.add_picture(f1b, width=Cm(11.5)); doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption(doc, '圖 2　同一組數據換成元件端橫軸的自偏壓軌跡')

    hdr = ['$V_{DS}$ 設定 (V)'] + ['$V_{GS}$ 元件 (V)', '$V_{DS}$ 元件 (V)'] * 2
    grp = [('', 1), ('$V_{GS}$ 設定 = 4 V', 2), ('$V_{GS}$ 設定 = 6 V', 2)]
    rows = []
    for v, gs in e1_meas:
        row = [f'{v:g}']
        for g in (gs[2], gs[3]):
            row += [num(g[2], '%.3f'), num(g[3], '%.3f')]
        rows.append(row)
    table(doc, hdr, rows, [2.6] + [3.0] * 4, font_pt=9, group_row=grp)
    caption(doc, '表 2　兩組導通曲線的元件端電壓（0 V 與 2 V 兩組幾乎不導通，元件端電壓等於電源設定值）')

    # ── 實驗二 ──────────────────────────────────────────────────────────────
    heading(doc, '實驗二：轉移特性曲線 $I_D$–$V_{GS}$ 與臨界電壓（Transfer Curve & Threshold Voltage）', 1)
    para(doc, f'電路：源極接地，汲極經 $R_1 = {r1_exp2:g}\\ \\Omega$ 接 CH2，閘極接 CH1。'
              f'三組汲極電源設定（1、3、5 V）各自把閘極電源由 0 V 每次加 0.5 V 掃到 5 V。'
              f'源極已接地，電源設定的 $V_{{GS}}$ 就是元件端的 $V_{{GS}}$。')
    for fn, cap in PHOTOS['exp2']:
        photo(doc, os.path.join(args.photos, fn), cap, tmpdir=build)

    heading(doc, '量測數據', 2)
    para(doc, '三組的平台高度約等於 $V_{DS}/R_1$（約 10／30／50 mA），是 $R_1$ 在限流而非元件飽和。', size=10)
    hdr = ['$V_{GS}$ (V)'] + ['實測 $V_{R_1}$ (V)', '$I_D$ (mA)'] * 3
    grp = [('', 1)] + [(f'$V_{{DS}}$ 設定 = {v} V', 2) for v in VDS_GROUPS]
    rows = []
    for v, gs in e2:
        row = [f'{v:g}']
        for g in gs:
            row += [num(g[0], '%.3f'), num(g[1], '%.3f')]
        rows.append(row)
    table(doc, hdr, rows, [2.2] + [2.2] * 6, font_pt=9, group_row=grp)
    caption(doc, f'表 3　實驗二記錄（$V_{{GS}}$ 0～5 V，每 0.5 V 共 {len(rows)} 點）')

    doc.add_picture(f2, width=Cm(17.0)); doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption(doc, '圖 3　左：三組 $I_D$–$V_{GS}$ 的實測點；'
                 '右：同一組數據的 √$I_D$–$V_{GS}$，用來看平方律直線段')
    para(doc, '$V_{GS}$ 在 1.5 V 以下三組都讀到 0.000 V，2.0 V 起開始導通，3.0 V 之後貼上平台；'
              '平台實測 9.78／29.14／49.20 mA，與 $V_{DS}/R_1$ 相差 3% 以內。'
              '$V_{GS} = 2.5$ V 那一列（8.75／16.03／11.32 mA）落在電流最陡的一段，讀數敏感、組間不具可比性。', size=10)

    heading(doc, '臨界電壓 $V_{th}$', 2)
    para(doc, '當天只做了 0.5 V 一階的粗掃，抬頭段只落得到一個點，**沒有符合規範的實測臨界電壓**。'
              '下表是用粗掃抬頭段最低的兩個點做平方根外插，級距太粗，只能當量級參考。', size=10)
    rows = []
    for g, vds in enumerate(VDS_GROUPS):
        tp = two_point_vth(e2, g, vds / r1_exp2 * 1000)
        if tp is None:
            rows.append([f'{vds:g}', '—', '—', '—', '—', '抬頭段取不到兩個點'])
            continue
        v1, i1, v2, i2, vth = tp
        rows.append([f'{vds:g}', f'{v1:g}', f'{i1:.3f}', f'{v2:g}', f'{i2:.3f}', f'{vth:.2f} V'])
    table(doc, ['$V_{DS}$ 設定 (V)', '取點 1 $V_{GS}$ (V)', '取點 1 $I_D$ (mA)',
                '取點 2 $V_{GS}$ (V)', '取點 2 $I_D$ (mA)', '外插 $V_{th}$'],
          rows, [2.4, 2.6, 2.6, 2.6, 2.6, 2.6], font_pt=9)
    caption(doc, '表 4　平方根外插的 $V_{th}$ 參考值（取點已排除被 $R_1$ 限流的平台段）：'
                 'V_{th} = V_{GS1} − (V_{GS2} − V_{GS1}) × √I_{D1} ÷ (√I_{D2} − √I_{D1})')
    para(doc, '3 V 與 5 V 兩組的外插值落在 1.9～2.0 V，在 2N7000 規格書 $V_{GS(th)} = 0.8 \\sim 3.0$ V 的範圍內；'
              '1 V 那組的兩個讀值都已在限流平台上，不符合平方律，故不外插。', size=10)

    os.makedirs(os.path.dirname(out), exist_ok=True)
    doc.save(out)
    print('wrote', out, f'{os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
