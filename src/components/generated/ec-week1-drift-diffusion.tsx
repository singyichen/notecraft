import type { ReactNode } from 'react';
import { Wind, Droplet } from 'lucide-react';

interface Row {
  aspect: string;
  drift: ReactNode;
  diffusion: ReactNode;
}

const ROWS: Row[] = [
  { aspect: '驅動力', drift: '電場', diffusion: '濃度梯度' },
  { aspect: '需不需要外加電壓', drift: '要', diffusion: '不要' },
  { aspect: '電流正比於什麼', drift: '電場強度', diffusion: '濃度的斜率' },
  {
    aspect: '高強度下的極限行為',
    drift: '速度飽和',
    diffusion: '濃度拉平後電流停止',
  },
  {
    aspect: '生活類比',
    drift: (
      <span className="flex items-center gap-1.5">
        <Wind size={14} className="text-blue-600 shrink-0" />
        風把落葉吹向同一方向
      </span>
    ),
    diffusion: (
      <span className="flex items-center gap-1.5">
        {/* 此處綠色刻意沿用專案的 --orange-* token：該 token 字面色其實是 emerald 綠
            （見 tokens.css 的歷史命名說明），剛好對上「擴散用綠色」的語意需求。 */}
        <Droplet size={14} className="text-orange-600 shrink-0" />
        墨水滴入清水自己散開
      </span>
    ),
  },
];

export default function EcWeek1DriftDiffusion() {
  return (
    <div className="not-prose overflow-x-auto">
      <div className="rounded-lg overflow-hidden border border-neutral-200">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: '24%' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '38%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left text-neutral-500 text-xs font-medium px-3 py-2 bg-neutral-50">
                面向
              </th>
              <th className="text-left bg-blue-50 text-blue-700 font-semibold px-3 py-2">
                漂移（drift）
              </th>
              <th className="text-left bg-orange-50 text-orange-700 font-semibold px-3 py-2">
                擴散（diffusion）
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.aspect}
                className="border-b border-neutral-200 hover:bg-neutral-50"
              >
                <td className="px-3 py-2.5 text-neutral-600 whitespace-normal break-words">
                  {row.aspect}
                </td>
                <td className="px-3 py-2.5 text-neutral-800 whitespace-normal break-words">
                  {row.drift}
                </td>
                <td className="px-3 py-2.5 text-neutral-800 whitespace-normal break-words">
                  {row.diffusion}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={3}
                className="bg-neutral-50 text-neutral-600 text-xs px-3 py-3 border-t-2 border-neutral-300"
              >
                兩者物理機制無關，但愛因斯坦關係式讓兩個係數維持固定比例；PN
                接面平衡就是這兩股電流剛好抵消。
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
