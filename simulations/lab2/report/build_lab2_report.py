"""Lab 2（BJT）結報簡單版：第一部分（實驗一特性曲線、實驗二 β）。

數據來源是已上傳 E3 的「實驗數據結果」PDF，抄成 measured/lab2-exp1-e3.csv，數字原樣不動。

用法（在 simulations/lab2/）：
  .venv/Scripts/python report/build_lab2_report.py --id 515661055 --name 陳欣怡 [--force]
  → src/content/notes/_outputs/lab2/<學號>_<姓名>_Lab 2 結報.docx
照片先從數據 PDF 抽到 report/build/photo1.png、photo2.png（見 README）。
"""
import argparse, csv, os, sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__)); LAB = os.path.join(HERE, '..'); ROOT = os.path.join(LAB, '..', '..')
sys.path.insert(0, os.path.join(LAB, '..', 'tools'))
from lab_report import Report, REQ, OPT, GREY

IMG = os.path.join(ROOT, 'public', 'note-images'); BUILD = os.path.join(HERE, 'build')
OUT_DIR = os.path.join(ROOT, 'src', 'content', 'notes', '_outputs', 'lab2')
RC = 995.0
GROUPS = [('15', 1.5, 0.414), ('20', 2.0, 0.539), ('22', 2.2, 0.680), ('24', 2.4, 0.627)]
COLORS = ['#7f8c8d', '#2e86de', '#e67e22', '#c0392b']

plt.rcParams['font.family'] = ['Microsoft JhengHei', 'Arial']
plt.rcParams['axes.unicode_minus'] = False


def load():
    with open(os.path.join(LAB, 'measured', 'lab2-exp1-e3.csv'), encoding='utf-8') as f:
        return list(csv.DictReader(f))


def ic(row, g):
    return float(row[f'g{g}_vrc']) / RC * 1000


def plot_curves(rows):
    fig, ax = plt.subplots(figsize=(6.4, 3.8), dpi=200)
    for (g, vbb, _), c in zip(GROUPS, COLORS):
        ax.plot([float(r[f'g{g}_vce']) for r in rows], [ic(r, g) for r in rows], 'o-', ms=3, lw=1, color=c, label=f'$V_{{BB}}$ = {vbb} V')
    ax.set_xlabel('$V_{CE}$ (V)'); ax.set_ylabel('$I_C$ (mA)'); ax.grid(alpha=.3); ax.legend(fontsize=8)
    ax.set_xlim(0, 15.5); ax.set_ylim(-0.2, 5.5)
    fig.tight_layout(); p = os.path.join(BUILD, 'exp1-curves.png'); fig.savefig(p); plt.close(fig); return p


def build(sid, name, out, force):
    os.makedirs(BUILD, exist_ok=True)
    rows = load()
    at = {r['VCC']: r for r in rows}
    r = Report(2, 'BJT 偏壓與特性曲線', name=name, student_id=sid, final=False)   # final=False 才會印出範本標題的（必要）／（選繳），同學版也保留；本檔沒有 todo／draft，不會多出黃綠底

    # 一、實驗目的
    r.h1('實驗目的', REQ)
    r.para('這次做的是第一部分。實驗一用分壓偏壓把 2N2222A 架起來，$V_{BB}$ 取 1.5、2.0、2.2、2.4 V 四組，每組把 $V_{CC}$ 從 0 V 每次加 0.5 V 掃到 15 V，畫出輸出特性曲線，看電晶體什麼時候算 OFF、什麼時候 ON，以及飽和區和主動區長什麼樣子。實驗二是在固定的偏壓下量 $R_1$、$R_2$ 的壓降，用 KCL 算出 $I_B$，再跟 $I_C$ 相除得到電流增益 $\\beta$。')

    # 二、實驗原理
    r.h1('實驗原理', REQ)
    r.para('我自己是把電晶體想成「基極電流控制集極電流的閥」。基極這邊，$R_1$ 從 $V_{BB}$ 送電流進來，一部分被跨在 B-E 上的 $R_2$ 分走，剩下的才進基極：')
    r.equation(r'I_B = \frac{V_{BB}-V_{BE}}{R_1} - \frac{V_{BE}}{R_2}')
    r.para('集極這邊，射極接地，所以 $R_C$ 兩端的壓降直接換成集極電流，不用把電流表串進去：')
    r.equation(r'I_C = \frac{V_{R_C}}{R_C},\qquad V_{CC} = V_{R_C} + V_{CE}')
    r.para('三個工作區對這次實驗的意思：$V_{BE}$ 不到 0.5 V 左右時基極幾乎沒電流，$I_C \\approx 0$，是 OFF；$V_{CC}$ 很小時 $V_{CE}$ 被壓在 0.2 V 以下，$I_C$ 跟著 $V_{CC}$ 一起往上爬，是飽和區；$V_{CC}$ 夠大之後 $I_C \\approx \\beta I_B$，幾乎不隨 $V_{CC}$ 變，曲線變平，是主動區。所以我預期每條曲線都是「先陡升、再變平」，平台高度由 $V_{BB}$ 決定。')

    # 三、Tinkercad 模擬
    r.h1('Tinkercad 模擬', REQ)
    r.para('進實驗室前先在 Tinkercad 搭過一次，主要是確認 2N2222 三支腳的方向和電表要夾哪裡。')
    r.figure(os.path.join(IMG, 'ec-week6-tinkercad', 'lab2-exp1-breadboard.png'), 'Tinkercad 實驗一：左表量 $V_{BE}$、中表量 $V_{CE}$，兩台電源負端共接。', 11)
    r.figure(os.path.join(IMG, 'ec-week6-tinkercad', 'lab2-exp2-breadboard.png'), 'Tinkercad 實驗二：同一塊板子，改量 $R_1$、$R_2$、$R_C$ 的壓降。', 11)
    r.para('Tinkercad 的電晶體是通用模型，數字只拿來確認接線和趨勢，預期值是用 LTspice 的 2N2222 模型算的。')

    # 四、實驗數據與結果
    r.h1('實驗數據與結果', REQ)
    r.h2('麵包版電路', REQ)
    r.figure(os.path.join(BUILD, 'photo1.png'), '量測現場：GPE-3323 雙路輸出、麵包板、GDM-532 三用電表。', 11)
    r.figure(os.path.join(BUILD, 'photo2.png'), '麵包板接線：$V_{BB}$ 經 $R_1$ 10 kΩ／$R_2$ 4.7 kΩ 分壓進基極，射極接地，集極串 $R_C$ 1 kΩ 到 $V_{CC}$。', 11)
    r.h2('視波器結果照片/圖片', '（必要：若有使用到視波器）')
    r.para('第一部分只用直流電源和三用電表，沒有用到示波器。')
    r.h2('實驗數據、表格', REQ)
    r.h3('基礎實驗', REQ)
    r.para('$R_C$ 實測 995 Ω。四組的 $V_{BE}$ 在掃描前各量一次：1.5 V 時 0.414 V、2.0 V 時 0.539 V、2.2 V 時 0.680 V、2.4 V 時 0.627 V。')
    hdr = ['$V_{CC}$ (V)'] + [h for g in ('1.5', '2.0', '2.2', '2.4') for h in (f'$V_{{CE}}$ ({g})', f'$V_{{R_C}}$ ({g})', f'$I_C$ ({g})')]
    body = [[x['VCC']] + [x[f'g{g}_{k}'] for g, *_ in GROUPS for k in ('vce', 'vrc', 'ic')] for x in rows]
    r.table(hdr, body, caption='實驗一輸出特性曲線記錄（括號內為 $V_{BB}$；電壓單位 V、電流 mA，與上傳 E3 版相同）', font_size=7)
    r.figure(plot_curves(rows), '實驗一輸出特性曲線，縱軸以 $I_C = V_{R_C}/R_C$ 計算。', 13)
    r.para('實驗二（$\\beta$）的記錄：', size=11)
    r.table(['$V_{BB}$ (V)', '$V_{R_1}$ (V)', '$V_{R_2}$ (V)', '$I_{R_1}$ (A)', '$I_{R_2}$ (A)', '$I_B$ (mA)', '$I_C$ (A)，$V_{CC}$ = 14 V', '$\\beta$'],
            [['2.4', '0.01', '3.12', '0.000001', '0.00066383', '0.6628', '0.002', '331.41']],
            caption='實驗二電流增益記錄（$R_1$ = 10 kΩ、$R_2$ = 4.7 kΩ）', font_size=8.5)
    r.h3('進階實驗 I', OPT)
    r.para('第二部分 CE 放大器這次沒有交數據，這一項不繳。')
    r.h3('進階實驗 II', OPT)
    r.para('沒有做。')

    # 五、實驗結果分析
    r.h1('實驗結果分析', None)
    i10 = {g: ic(at['10.0'], g) for g, *_ in GROUPS}
    r.para(f'四條曲線的形狀跟我預期的一樣。$V_{{BB}}$ = 1.5 V 那組 $V_{{R_C}}$ 從頭到尾都是 0.001 V，換算 $I_C$ 只有 1 µA 左右，這時 $V_{{BE}}$ 只有 0.414 V，電晶體根本沒打開，算 OFF。另外三組都 ON：$V_{{CC}}$ = 10 V 時 $I_C$ 分別是 {i10["20"]:.3f}、{i10["22"]:.3f}、{i10["24"]:.3f} mA，$V_{{BB}}$ 只多 0.2 V，電流就翻了兩倍多，可以看出 $I_C$ 對基極偏壓非常敏感。')
    r.para('2.4 V 那組最看得出飽和區：$V_{CC}$ 在 4 V 以下時，$V_{R_C}$ 幾乎追著 $V_{CC}$ 走（3.0 V 時 2.868 V），電流還沒被電晶體「管住」；到 5 V 以後 $V_{R_C}$ 停在 4.4 V 上下，再加到 15 V 也只慢慢爬到 4.838 V。平台不是完全水平，每加 1 V 大概多 0.04 mA，我猜是爾利效應（Early effect）。')
    ib = (2.4 - 0.627) / 10e3 - 0.627 / 4.7e3
    r.para(f'$\\beta$ 的部分，實驗二算出來是 331，比 LTspice 模型的 200 還大。我另外用實驗一 2.4 V 那組驗算：代 $V_{{BE}}$ = 0.627 V 進第二節的式子，$I_B$ ≈ {ib*1e6:.1f} µA，$V_{{CC}}$ = 10 V 時 $I_C$ = {i10["24"]:.3f} mA，$\\beta$ ≈ {i10["24"]/1000/ib:.0f}。兩個差很多，後來發現這個算法對 $V_{{BE}}$ 很敏感，$V_{{BE}}$ 差 10 mV，$I_B$ 就差約 3 µA（7%），而我的 $V_{{BE}}$ 讀值本身就不太穩（2.4 V 那組 0.627 V 反而比 2.2 V 那組的 0.680 V 低），所以這題我只敢說 $\\beta$ 落在一百到三百之間。')

    r.h1('心得', None)
    r.para('這次最大的收穫是看懂特性曲線為什麼會先陡後平：前面那段其實是電晶體還在飽和，電流是 $R_C$ 和 $V_{CC}$ 決定的，平掉之後才輪到基極電流說話。另外 $\\beta$ 這種要靠 $V_{BE}$ 相減的量，誤差比我想的大很多，下次會在每組掃完後再補量一次 $V_{BE}$。')

    out = out or os.path.join(OUT_DIR, f'{sid}_{name}_Lab 2 結報.docx')
    r.save(out, force=force)
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--id', required=True); ap.add_argument('--name', required=True)
    ap.add_argument('-o'); ap.add_argument('--force', action='store_true')
    a = ap.parse_args()
    build(a.id, a.name, a.o, a.force)
