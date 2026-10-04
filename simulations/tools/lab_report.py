"""電子學實驗結報（助教格式，見 _references/電子學實作系列/第二週/Lab_結報形式參考.pdf）的 .docx 產生器。

兩種用法：
1. 空白範本：python lab_report.py --lab 2 --title "實驗名稱" -o Lab_結報範本.docx
2. 當函式庫：各 lab 的 build 腳本 import Report，把模擬圖、表格、草稿填進固定的六個章節。

標記慣例（交件前全部要消失）：
  黃底 = 待填（實驗當天的照片、數據、自己的分析）
  綠底 = 草稿（由筆記整理的要點，要用自己的話改寫）
需要 python-docx（simulations/lab1/.venv 已裝）。
"""
import argparse, os, re
import latex2mathml.converter as _l2m
import mathml2omml as _m2o
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE, WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_COLOR_INDEX, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

LATIN, CJK = 'Arial', '微軟正黑體'
RED, BLUE, GREY = RGBColor(0xFF, 0, 0), RGBColor(0, 0, 0xFF), RGBColor(0x55, 0x55, 0x55)
TODO, DRAFT = WD_COLOR_INDEX.YELLOW, WD_COLOR_INDEX.BRIGHT_GREEN
REQ, OPT = '（必要）', '（選繳）'
CN = '一二三四五六七八九十'


def _font(run, size=None, bold=None, color=None, highlight=None, italic=None):
    run.font.name = LATIN
    rpr = run._element.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    if rf is None:
        rf = OxmlElement('w:rFonts'); rpr.append(rf)
    for k in ('w:ascii', 'w:hAnsi', 'w:cs'):
        rf.set(qn(k), LATIN)
    rf.set(qn('w:eastAsia'), CJK)
    if size: run.font.size = Pt(size)
    if bold is not None: run.font.bold = bold
    if italic is not None: run.font.italic = italic
    if color is not None: run.font.color.rgb = color
    if highlight is not None: run.font.highlight_color = highlight
    return run


OMML_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/math'


def omml(latex, display=False):
    """LaTeX → MathML（latex2mathml）→ OMML（mathml2omml），回傳可直接掛進 <w:p> 的 lxml 元素。
    display=True 包成 <m:oMathPara>，Word 會當獨立的置中方程式；否則是行內方程式。"""
    xml = _m2o.convert(_l2m.convert(latex))
    xml = xml.replace('<m:oMath>', f'<m:oMath xmlns:m="{OMML_NS}">', 1)
    if display:
        xml = f'<m:oMathPara xmlns:m="{OMML_NS}">{xml}</m:oMathPara>'
    return parse_xml(xml)


def add_runs(par, text, **kw):
    """支援 $LaTeX$（Word 原生方程式）、_{下標}、^{上標}、**粗體** 的極簡標記，其餘照字面輸出。
    公式一律寫 $...$，_{}／^{} 只是舊寫法的相容。"""
    for tok in re.split(r'(\$[^$]+\$|_\{[^}]*\}|\^\{[^}]*\}|\*\*[^*]+\*\*)', text):
        if not tok:
            continue
        if tok.startswith('$') and tok.endswith('$') and len(tok) > 2:
            par._p.append(omml(tok[1:-1]))
        elif tok.startswith('_{'):
            _font(par.add_run(tok[2:-1]), **kw).font.subscript = True
        elif tok.startswith('^{'):
            _font(par.add_run(tok[2:-1]), **kw).font.superscript = True
        elif tok.startswith('**'):
            _font(par.add_run(tok[2:-2]), **{**kw, 'bold': True})
        else:
            _font(par.add_run(tok), **kw)
    return par


def _cell_borders(cell, sz=8):
    tcPr = cell._element.get_or_add_tcPr()
    b = OxmlElement('w:tcBorders')
    for side in ('top', 'left', 'bottom', 'right'):
        e = OxmlElement(f'w:{side}')
        e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), str(sz)); e.set(qn('w:color'), '000000')
        b.append(e)
    tcPr.append(b)


def _shade(cell, fill='EEEEEE'):
    tcPr = cell._element.get_or_add_tcPr()
    s = OxmlElement('w:shd'); s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), fill)
    tcPr.append(s)


class Report:
    def __init__(self, lab, title, name='王◯◯', student_id='5156610◯◯', final=False, instructor='林尚亭', ta='林承恩', toc=None):
        """toc：[(level, text, page), ...] 給就在封面後插一頁目錄（頁碼要兩段式產生：先 build 一次轉 PDF 找頁碼，見 build_lab1_report.py）。"""
        self.final = final   # True：交件版，不印使用說明、草稿不上色、待填一律不輸出、空格不塗黃
        self.doc = Document()
        sec = self.doc.sections[0]
        sec.page_width, sec.page_height = Cm(21), Cm(29.7)
        sec.left_margin = sec.right_margin = Cm(2.54); sec.top_margin = sec.bottom_margin = Cm(2.54)
        st = self.doc.styles['Normal']; st.font.name = LATIN; st.font.size = Pt(11)
        st.element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), CJK)
        self.lab, self.title, self.name, self.sid = lab, title, name, student_id
        self.instructor, self.ta = instructor, ta
        self._h1 = 0; self._h2 = 0; self._h3 = 0; self._fig = 0; self._tab = 0
        self.headings = []   # (level, 編號後的標題文字)，給目錄用
        self._footer_page_number()
        self._cover()
        if toc:
            self._toc(toc)

    # ---- 結構 ----
    def _cover(self):
        for _ in range(7): self.doc.add_paragraph()
        for line in (f'Lab {self.lab}', self.title, '結報'):
            p = self.doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            _font(p.add_run(line), size=24, bold=True)
        for _ in range(7): self.doc.add_paragraph()
        for label, val in (('課程教師：', self.instructor), ('課程助教：', self.ta), ('姓名：', self.name), ('學號：', self.sid)):
            p = self.doc.add_paragraph(); p.paragraph_format.left_indent = Cm(8.5)
            _font(p.add_run(label), size=16, bold=True)
            _font(p.add_run(val), size=16, bold=True, highlight=TODO if '◯' in val else None)
        self.page_break()

    def _footer_page_number(self):
        p = self.doc.sections[0].footer.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(); _font(r, size=9)
        for tag, text in (('begin', None), (None, ' PAGE '), ('end', None)):
            if tag:
                fc = OxmlElement('w:fldChar'); fc.set(qn('w:fldCharType'), tag); r._r.append(fc)
            else:
                it = OxmlElement('w:instrText'); it.set(qn('xml:space'), 'preserve'); it.text = text; r._r.append(it)

    def _toc(self, entries):
        p = self._apply_break(self.doc.add_paragraph()); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(14)
        _font(p.add_run('目錄'), size=20, bold=True)
        for level, text, page in entries:
            p = self.doc.add_paragraph(); pf = p.paragraph_format
            pf.left_indent = Cm({1: 0, 2: 0.9, 3: 1.8}.get(level, 2.5)); pf.space_before = Pt(6 if level == 1 else 1); pf.space_after = Pt(1)
            pf.tab_stops.add_tab_stop(Cm(15.9), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
            size = {1: 12.5, 2: 11, 3: 10.5}.get(level, 10.5)
            _font(p.add_run(text), size=size, bold=(level == 1)); _font(p.add_run(f'\t{page}'), size=size, bold=(level == 1))
        self.page_break()

    def page_break(self):
        # 不另加一個帶分頁符號的空段落（前一頁剛好排滿時它會自己佔一整頁），改成讓下一個標題「段前分頁」
        self._break_next = True

    def _apply_break(self, p):
        if getattr(self, '_break_next', False):
            p.paragraph_format.page_break_before = True
            self._break_next = False
        return p

    def _heading(self, text, tag, size, space_before, level=None):
        if level:
            self.headings.append((level, text))
        p = self._apply_break(self.doc.add_paragraph()); p.paragraph_format.space_before = Pt(space_before); p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        _font(p.add_run(text), size=size, bold=size < 20)
        if tag and not self.final:   # 交件版不印範本的「（必要）」「（選繳）」標記
            _font(p.add_run(tag), size=size, bold=True, color=RED if tag == REQ else BLUE)
        return p

    def h1(self, text, tag=REQ):
        self._h1 += 1; self._h2 = 0
        return self._heading(f'{CN[self._h1 - 1]}、{text}', tag, 20, 18, level=1)

    def h2(self, text, tag=None):
        self._h2 += 1; self._h3 = 0
        return self._heading(f'({CN[self._h2 - 1]})、{text}', tag, 14, 12, level=2)

    def h3(self, text, tag=None):
        self._h3 += 1
        return self._heading(f'{self._h3}、{text}', tag, 12, 8, level=3)

    def h4(self, text):
        return self._heading(text, None, 11, 6)

    # ---- 內容 ----
    def para(self, text, highlight=None, color=None, size=11, align=None, italic=None):
        p = self._apply_break(self.doc.add_paragraph()); p.paragraph_format.space_after = Pt(6); p.paragraph_format.line_spacing = 1.35
        if align == 'center': p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        return add_runs(p, text, size=size, highlight=highlight, color=color, italic=italic)

    def todo(self, text):
        if self.final:
            return None
        return self.para(f'【待填】{text}', highlight=TODO)

    def draft(self, text):
        if self.final:
            return self.para(text)
        return self.para(f'【草稿，改寫後刪除此標記】{text}', highlight=DRAFT)

    def bullets(self, items, highlight=None):
        for it in items:
            p = self.doc.add_paragraph(style='List Bullet'); p.paragraph_format.space_after = Pt(3)
            add_runs(p, it, size=11, highlight=highlight)

    def equation(self, latex):
        """獨立置中的方程式；參數是 LaTeX（不含 $）。"""
        p = self.doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(6)
        p._p.append(omml(latex, display=True))
        return p

    def code(self, text):
        t = self.doc.add_table(rows=1, cols=1); t.alignment = WD_TABLE_ALIGNMENT.CENTER
        c = t.rows[0].cells[0]; _cell_borders(c, 4); _shade(c, 'F6F6F6')
        c.paragraphs[0].paragraph_format.space_after = Pt(0)
        for i, line in enumerate(text.strip('\n').split('\n')):
            p = c.paragraphs[0] if i == 0 else c.add_paragraph()
            p.paragraph_format.space_before = Pt(0); p.paragraph_format.space_after = Pt(0); p.paragraph_format.line_spacing = 1.0
            r = p.add_run(line); r.font.name = 'Menlo'; r.font.size = Pt(8.5)
            r._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), CJK)
        self.doc.add_paragraph()

    def box(self, text, height_cm=6.0):
        """助教範本裡的空白框：放照片／圖表的位置。"""
        t = self.doc.add_table(rows=1, cols=1); t.alignment = WD_TABLE_ALIGNMENT.CENTER
        row = t.rows[0]; row.height = Cm(height_cm); row.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
        c = row.cells[0]; c.width = Cm(13.5); _cell_borders(c)
        c.vertical_alignment = 1
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _font(p.add_run(f'[{text}]'), size=10, highlight=TODO)
        self.doc.add_paragraph()

    def figure(self, path, caption, width_cm=14.0):
        if not os.path.exists(path):
            return self.box(f'找不到圖檔 {os.path.basename(path)}：{caption}')
        p = self.doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.keep_with_next = True
        p.add_run().add_picture(path, width=Cm(width_cm))
        self._fig += 1
        self.para(f'圖 {self._fig}　{caption}', size=9.5, color=GREY, align='center')

    def table(self, header, rows, caption=None, col_widths=None, todo_blank=True, font_size=9.5):
        """rows 裡的 None／'' 會留空並上黃底（待填）。"""
        if caption:
            self._tab += 1
            p = self.para(f'表 {self._tab}　{caption}', size=9.5, color=GREY, align='center'); p.paragraph_format.keep_with_next = True
        t = self.doc.add_table(rows=1 + len(rows), cols=len(header)); t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for j, h in enumerate(header):
            c = t.rows[0].cells[j]; _cell_borders(c); _shade(c)
            p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; add_runs(p, h, size=font_size, bold=True)
        for i, r in enumerate(rows, 1):
            for j, v in enumerate(r):
                c = t.rows[i].cells[j]; _cell_borders(c)
                p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                if v is None or v == '':
                    if todo_blank and not self.final: _font(p.add_run('　　'), size=font_size, highlight=TODO)
                else:
                    add_runs(p, str(v), size=font_size)
        n = len(t.rows)
        for i, row in enumerate(t.rows):   # 整張表不跨頁：每列不可切開、列與列之間 keep-with-next
            trPr = row._tr.get_or_add_trPr(); cs = OxmlElement('w:cantSplit'); trPr.append(cs)
            for c in row.cells:
                c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER   # 儲存格文字水平＋垂直都置中
                for cp in c.paragraphs:
                    cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    cp.paragraph_format.space_before = Pt(0); cp.paragraph_format.space_after = Pt(0); cp.paragraph_format.line_spacing = 1.0
                    if i < n - 1: cp.paragraph_format.keep_with_next = True
        tw = t._tbl.tblPr.find(qn('w:tblW'))
        if tw is not None and not col_widths:
            tw.set(qn('w:type'), 'pct'); tw.set(qn('w:w'), '5000')   # 資料表撐滿版心
        if col_widths:
            for row in t.rows:
                for j, w in enumerate(col_widths): row.cells[j].width = Cm(w)
        self.doc.add_paragraph()
        return t

    def legend(self):
        if self.final:
            return
        t = self.doc.add_table(rows=1, cols=1); t.alignment = WD_TABLE_ALIGNMENT.CENTER
        c = t.rows[0].cells[0]; _cell_borders(c, 4); _shade(c, 'FFF9E5')
        p = c.paragraphs[0]
        add_runs(p, '使用說明（交件前刪除整個框）：', size=9.5, bold=True)
        for text, hl in (('黃底', TODO), (' = 待填：實驗當天的照片、數據，以及自己的分析。', None), ('綠底', DRAFT),
                         (' = 草稿：由預習筆記整理的要點，請用自己的話改寫後移除底色。評分辦法：結報明顯過度依賴 AI 工具以 8 折計，數據表必須與當天上傳 E3 的一致。', None)):
            _font(p.add_run(text), size=9.5, highlight=hl)
        p2 = c.add_paragraph(); add_runs(p2, f'檔名：學號_姓名_Lab{self.lab}（例：515661099_王小明_Lab{self.lab}）。在 Word「尋找」搜尋【 可以逐一跳到還沒處理的地方。', size=9.5)
        self.doc.add_paragraph()

    def save(self, path, force=False):
        z = self.doc.settings.element.find(qn('w:zoom'))   # python-docx 預設範本少了 w:percent，XSD 驗證會抱怨
        if z is not None and z.get(qn('w:percent')) is None:
            z.set(qn('w:percent'), '100')
        if os.path.exists(path) and not force:
            raise SystemExit(f'{path} 已存在。重跑會蓋掉你在 Word 裡手改的內容；確定要覆寫請加 --force，或用 -o 指定新檔名。')
        os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
        self.doc.save(path); print('wrote', path)


def data_section(rep, label, tag, measures=('測量項目1', '測量項目2', '測量項目3')):
    rep.h3(label, tag)
    rep.todo('說明這一項量了什麼、怎麼量（電路、儀器檔位、掃描級距）。')
    rep.table(list(measures), [[None] * len(measures)], caption=None)
    rep.para('（表格請自行設計與排版）', size=9.5, color=GREY)
    rep.box('相關實驗結果圖表，ex: I-V 曲線圖')


def blank(lab, title, out, force=False):
    """和助教 PDF 逐節對應的空白範本。"""
    r = Report(lab, title)
    r.legend()
    r.h1('實驗目的'); r.todo('敘述實驗內容與實驗目的。')
    r.h1('實驗原理')
    r.h2('原理一'); r.todo('解釋實驗應用到的原理。')
    r.h2('原理二'); r.todo('文字內容。')
    r.h1('Tinkercad 模擬'); r.box('Tinkercad 模擬畫面')
    r.page_break()
    r.h1('實驗數據與結果')
    r.h2('麵包板電路', REQ); r.box('實作麵包板電路照片')
    r.h2('示波器結果照片／圖片', '（必要：若有使用到示波器）'); r.box('示波器結果照片')
    r.h2('實驗數據、表格', REQ)
    data_section(r, '基礎實驗', REQ); data_section(r, '進階實驗 I', OPT); data_section(r, '進階實驗 II', OPT)
    r.h1('實驗結果分析'); r.todo('文字內容：實測與理論／模擬的比較、誤差來源、講義問題的回答。')
    r.h1('程式模擬分析', OPT); r.todo('LTspice／KiCad 等電路模擬（加分項）：網表或電路圖、模擬結果圖、與實測的比較。')
    r.save(out, force)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='產生助教格式的空白結報範本')
    ap.add_argument('--lab', default='N'); ap.add_argument('--title', default='[實驗名稱]')
    ap.add_argument('-o', '--out', default='Lab_結報範本.docx'); ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    blank(a.lab, a.title, a.out, a.force)
