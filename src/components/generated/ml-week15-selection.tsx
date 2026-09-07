import { ArrowRight, Target, GitBranch, CircleDashed, Percent, type LucideIcon } from 'lucide-react';

interface ClusterOption {
  id: string;
  condition: string;
  algoName: string;
  note: string;
  Icon: LucideIcon;
  bg: string;
  text: string;
}

// 四種演算法各自一組色票：柔和底色 + 對應飽和文字色，皆取自 notecraft-design 的
// indigo / emerald / warning / info 色票（本篇姊妹元件 ml-week15-four-definitions
// 尚未生成，故在此自行定義；四色彼此在色相上明顯可分，供兩個元件日後對讀）。
const OPTIONS: ClusterOption[] = [
  {
    id: 'kmeans',
    condition: '群大致是球狀、大小相近，而且你已經知道要分幾群',
    algoName: 'k-means',
    note: '對離群點敏感，須先做特徵標準化',
    Icon: Target,
    bg: 'var(--blue-50)',
    text: 'var(--blue-700)',
  },
  {
    id: 'hierarchical',
    condition: '想看群之間的階層關係，或不想先決定 k',
    algoName: '階層式分群（hierarchical）',
    note: '先得到 dendrogram，事後橫切一刀再決定 k',
    Icon: GitBranch,
    bg: 'var(--orange-50)',
    text: 'var(--orange-700)',
  },
  {
    id: 'dbscan',
    condition: '群的形狀不規則，而且資料裡有離群點',
    algoName: 'DBSCAN',
    note: '離群點會被標成雜訊而不是硬塞進某一群；要調 eps 與 min_samples',
    Icon: CircleDashed,
    bg: 'var(--warning-50)',
    text: 'var(--warning-700)',
  },
  {
    id: 'gmm',
    condition: '群會重疊，而且需要「有多確定」的信心度',
    algoName: '高斯混合模型（GMM）',
    note: '輸出的是機率歸屬而不是硬分配',
    Icon: Percent,
    bg: 'var(--info-50)',
    text: 'var(--info-500)',
  },
];

export default function MlWeek15Selection() {
  return (
    <div className="not-prose flex flex-col">
      {OPTIONS.map((option, index) => (
        <div
          key={option.id}
          className="flex flex-wrap items-start gap-x-2 gap-y-2 py-3"
          style={{
            borderBottom:
              index < OPTIONS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
          }}
        >
          <span
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}
          >
            {index + 1}
          </span>
          <span
            className="text-sm leading-snug"
            style={{ color: 'var(--text-body)' }}
          >
            {option.condition}
          </span>
          <ArrowRight
            size={16}
            className="mt-1 shrink-0"
            style={{ color: 'var(--text-muted)' }}
          />
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold"
            style={{ background: option.bg, color: option.text }}
          >
            <option.Icon size={14} />
            {option.algoName}
          </span>
          <span
            className="w-full pl-7 text-xs leading-snug"
            style={{ color: 'var(--text-muted)' }}
          >
            {option.note}
          </span>
        </div>
      ))}
    </div>
  );
}
