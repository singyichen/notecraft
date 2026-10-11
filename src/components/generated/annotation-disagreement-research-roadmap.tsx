import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowDown,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileSearch,
  GitBranch,
  Languages,
  Network,
  ShieldCheck,
} from 'lucide-react';

interface StageSpec {
  number: number;
  title: string;
  short: string;
  goal: string;
  work: string[];
  output: string;
  gate: string;
  optional?: boolean;
}

const STAGES: StageSpec[] = [
  {
    number: 1,
    title: '固定研究問題',
    short: '定義預測時點、分歧與成功標準',
    goal: '把「預測什麼」與「模型能看到什麼」寫成不可任意變動的實驗協議。',
    work: ['定義部分標註觀測情境', '固定主要指標 Recall@10%', '區分分歧、錯誤與複核需求'],
    output: '研究問題、假設與預註冊式評估規格',
    gate: '目標可由完整標註推導，特徵只來自預測當下可見資訊。',
  },
  {
    number: 2,
    title: '資料與授權調研',
    short: '英文真實資料＋繁中資料策略',
    goal: '確認資料確實保留 item、annotator 與個別 label，且授權允許研究使用。',
    work: ['審核 TID-8 子資料集', '盤點繁中多標註資料', '計算圖稀疏度與分歧比例'],
    output: 'Dataset Card、授權表與主資料集決策',
    gate: '若真實資料不合格，先換子資料集；仍不合格才使用模擬備援。',
  },
  {
    number: 3,
    title: '雙語資料協議',
    short: '英文主實驗＋繁中小型驗證',
    goal: '讓英文公開資料回答方法可行性，繁中資料回答論文目標使用情境是否可轉移。',
    work: ['item-level 資料切分', '建立繁中 150–300 筆 pilot', '禁止以翻譯標籤冒充繁中人類分歧'],
    output: '固定 split、部分觀測產生器與繁中標註規範',
    gate: '英文與繁中都必須保留原始個別標註，不只保存多數決結果。',
  },
  {
    number: 4,
    title: '最低基準線',
    short: '隨機、entropy、傳統分類器',
    goal: '先量出不用深度模型與圖模型時，透明方法能達到的複核排序品質。',
    work: ['30 次隨機排序', '可見標籤 entropy／margin', 'Logistic Regression 與 Gradient Boosting'],
    output: '固定格式 baseline 表與可重現評估程式',
    gate: '所有模型使用完全相同的 item split、可見標註與 K 預算。',
  },
  {
    number: 5,
    title: '多語 Embedding',
    short: '同一特徵管線處理英文與繁中',
    goal: '驗證文字語意能否在可見標註統計之外，提早辨識容易引發分歧的項目。',
    work: ['BGE-M3 作本機主模型', 'Voyage／Mistral 作選配 API 對照', '文字、結構化、混合特徵消融'],
    output: '雙語 embedding 快取、模型卡與消融結果',
    gate: '不能只用英文結果宣稱繁中有效；繁中必須單獨回報。',
  },
  {
    number: 6,
    title: 'GraphSAGE 選做',
    short: 'item–annotator 異質二分圖',
    goal: '檢查圖結構能否在相同可見資訊下，穩定勝過非圖模型。',
    work: ['建立 HeteroData', '只放入可見 annotation edges', '五個 seeds 與冷啟動測試'],
    output: 'GraphSAGE 與最佳非圖模型的公平比較',
    gate: '若增益不穩定或不足以抵銷成本，正式結論就是保留簡單模型。',
    optional: true,
  },
  {
    number: 7,
    title: '穩健性與錯誤分析',
    short: '多 seeds、budget、語言與失敗案例',
    goal: '確認結論不是由單次抽樣、單一語言或單一分歧門檻造成。',
    work: ['paired bootstrap 信賴區間', '英／繁中分語言結果', 'false positive／negative 分類'],
    output: '穩健性矩陣、信賴區間與失敗案例集',
    gate: '不只呈現最佳 seed，也不把分歧直接解讀成錯誤。',
  },
  {
    number: 8,
    title: '論文與產品決策',
    short: '把結果轉成 Label Suite 建議',
    goal: '將模型結果轉成可執行的資料紀錄、複核流程與是否導入模型的決策。',
    work: ['模型成本效益判讀', '定義未來事件欄位', '完成報告、簡報與可重現說明'],
    output: '一頁決策摘要、論文章節與平台資料需求',
    gate: '只有取得真實繁中平台資料後，才能主張正式工作流程效益。',
  },
];

const ICONS = [
  BookOpenCheck,
  FileSearch,
  Languages,
  BarChart3,
  BrainCircuit,
  Network,
  ShieldCheck,
  CheckCircle2,
];

export default function AnnotationDisagreementResearchRoadmap() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const stage = STAGES[active];
  const ActiveIcon = ICONS[active];

  return (
    <div className="not-prose space-y-4" style={{ fontFamily: 'var(--font-sans)' }}>
      <div className="relative">
        <div
          className="absolute left-[17px] top-5 bottom-5 w-px"
          style={{ background: 'var(--border-default)' }}
          aria-hidden="true"
        />
        <div className="space-y-2">
          {STAGES.map((item, index) => {
            const Icon = ICONS[index];
            const selected = active === index;
            return (
              <React.Fragment key={item.number}>
                <motion.button
                  type="button"
                  aria-pressed={selected}
                  aria-label={`第 ${item.number} 階段：${item.title}`}
                  onClick={() => setActive(index)}
                  className="relative w-full text-left flex items-start gap-3 px-2 py-2 focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    background: selected ? 'var(--surface-brand-soft)' : 'transparent',
                    border: selected ? '1px solid var(--border-brand)' : '1px solid transparent',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text-body)',
                  }}
                  whileHover={reduceMotion ? undefined : { x: 3 }}
                  transition={{ duration: 0.2 }}
                >
                  <span
                    className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center"
                    style={{
                      background: selected ? 'var(--blue-700)' : 'var(--surface-card)',
                      color: selected ? 'var(--text-on-brand)' : 'var(--text-brand)',
                      border: '1px solid var(--border-brand)',
                      borderRadius: 'var(--radius-circle)',
                      fontSize: 'var(--text-2xs)',
                      fontWeight: 'var(--weight-bold)',
                    }}
                  >
                    {item.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <Icon size={15} aria-hidden="true" style={{ color: 'var(--text-brand)' }} />
                      <span
                        style={{
                          color: 'var(--text-strong)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: 'var(--weight-bold)',
                        }}
                      >
                        {item.title}
                      </span>
                      {item.optional && (
                        <span
                          style={{
                            color: 'var(--warning-700)',
                            background: 'var(--warning-50)',
                            borderRadius: 'var(--radius-pill)',
                            padding: '1px 7px',
                            fontSize: 'var(--text-2xs)',
                            fontWeight: 'var(--weight-medium)',
                          }}
                        >
                          選做
                        </span>
                      )}
                    </span>
                    <span
                      className="mt-0.5 block"
                      style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}
                    >
                      {item.short}
                    </span>
                  </span>
                </motion.button>

                {index < STAGES.length - 1 && (
                  <div className="flex h-3 items-center pl-[11px]" aria-hidden="true">
                    <ArrowDown size={13} style={{ color: 'var(--text-muted)' }} />
                  </div>
                )}

                {index === 1 && (
                  <div
                    className="ml-9 px-3 py-2"
                    style={{
                      background: 'var(--warning-50)',
                      borderLeft: '3px solid var(--warning-500)',
                      color: 'var(--warning-700)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <span className="inline-flex items-center gap-1 font-medium">
                      <GitBranch size={13} aria-hidden="true" />
                      資料不合格：換子資料集；仍不合格才走模擬備援
                    </span>
                  </div>
                )}

                {index === 5 && (
                  <div
                    className="ml-9 px-3 py-2"
                    style={{
                      background: 'var(--surface-sunken)',
                      borderLeft: '3px solid var(--neutral-400)',
                      color: 'var(--text-body)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <span className="inline-flex items-center gap-1 font-medium">
                      <GitBranch size={13} aria-hidden="true" />
                      GNN 無穩定增益：停止加深，保留透明的簡單模型
                    </span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        <motion.section
          key={stage.number}
          aria-live="polite"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
          className="p-4"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center"
              style={{
                background: 'var(--surface-brand-soft)',
                color: 'var(--text-brand)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <ActiveIcon size={18} aria-hidden="true" />
            </span>
            <div>
              <div style={{ color: 'var(--text-strong)', fontWeight: 'var(--weight-bold)' }}>
                階段 {stage.number}：{stage.title}
              </div>
              <p className="mt-1 mb-0" style={{ color: 'var(--text-body)', fontSize: 'var(--text-sm)' }}>
                {stage.goal}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div
                className="mb-1"
                style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}
              >
                主要工作
              </div>
              <ul className="m-0 space-y-1 pl-4" style={{ color: 'var(--text-body)', fontSize: 'var(--text-xs)' }}>
                {stage.work.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>階段產出</div>
                <div style={{ color: 'var(--text-strong)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>
                  {stage.output}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>通過條件</div>
                <div style={{ color: 'var(--text-brand)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>
                  {stage.gate}
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </AnimatePresence>

      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{
          background: 'var(--success-50)',
          color: 'var(--success-500)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          fontWeight: 'var(--weight-medium)',
        }}
      >
        <Database size={14} aria-hidden="true" />
        最低成功線：英文真實資料＋繁中 pilot＋baseline＋多語 Embedding；GNN 可停止而不影響交件。
      </div>
    </div>
  );
}
