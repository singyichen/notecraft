/**
 * 找出筆記正文裡「寫了 `**` 卻不會變成粗體」的位置。
 *
 * CommonMark 的 flanking 規則：`**` 要能當**開頭**，後面必須是非空白，且
 *（後面不是標點 或 前面是空白/標點）；要能當**收尾**，前面必須是非空白，且
 *（前面不是標點 或 後面是空白/標點）。中文寫作最常踩到兩種：
 *
 *   `**名詞（term）**是…`  收尾 `**` 前是 `）`、後接中文 → 收不掉
 *   `…是**「引文」**。`     開頭 `**` 前是中文、後接 `「` → 開不了
 *
 * 兩種都會讓整段照字面輸出 `**`，而 `astro build` 與 KaTeX 檢查都抓不到。
 *
 * 單純的 grep 做不到這件事：行尾的 `）**` 是合法收尾（行尾等同空白）會誤報，
 * 而 `。**` 這類非括號標點、以及開頭失效的情形又會漏抓。因此這裡實際做一次配對。
 */
export interface BrokenBold {
  line: number;
  text: string;
}

const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c);
// CommonMark 0.30 起，「標點」涵蓋 Unicode 的 P（標點）與 S（符號）兩大類，
// 因此 `→`、`⭐`、`$` 都算——漏掉 S 類會把 `（PCB）**→` 這種合法收尾誤判為失效。
const isPunct = (c: string | undefined) => c !== undefined && /[\p{P}\p{S}]/u.test(c);

/**
 * 把不該檢查的區塊遮掉，保留行號與行內位移。
 *
 * 行內程式碼要遮成**文字**（`x`）而不是空白：`**\`fit\`**` 若被遮成 `**    **`，
 * 收尾的 `**` 前面就變成空白、判定為不能收尾，整段合法寫法會被誤報。
 */
function blank(src: string): string {
  const toSpace = (s: string) => s.replace(/[^\n]/g, " ");
  const toText = (s: string) => s.replace(/[^\n]/g, "x");
  return src
    .replace(/^---\n[\s\S]*?\n---/, toSpace) // frontmatter
    .replace(/```[\s\S]*?```/g, toSpace) // 圍欄程式碼
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, toSpace) // @ai-visualize / @ai-reference 標記
    .replace(/<[A-Za-z][^\n>]*>/g, toSpace) // JSX / HTML 標籤（屬性值裡的 ** 不是正文）
    .replace(/`[^`\n]*`/g, toText); // 行內程式碼
}

export function findBrokenBold(src: string): BrokenBold[] {
  const masked = blank(src);
  const rawLines = src.split("\n");
  const out: BrokenBold[] = [];

  masked.split("\n").forEach((line, idx) => {
    // 收集本行所有 `**` 的位置，並判斷各自能不能當開頭／收尾
    const marks: { pos: number; canOpen: boolean; canClose: boolean }[] = [];
    for (let i = 0; i < line.length - 1; i++) {
      if (line[i] !== "*" || line[i + 1] !== "*") continue;
      const before = i > 0 ? line[i - 1] : undefined;
      const after = i + 2 < line.length ? line[i + 2] : undefined;
      const leftFlanking = !isSpace(after) && (!isPunct(after) || isSpace(before) || isPunct(before));
      const rightFlanking = !isSpace(before) && (!isPunct(before) || isSpace(after) || isPunct(after));
      marks.push({ pos: i, canOpen: leftFlanking, canClose: rightFlanking });
      i++; // 跳過配對的第二個 *
    }
    if (marks.length === 0) return;

    // 由左至右配對：能開就推入堆疊，能收且堆疊非空就彈出。剩下的就是不會生效的標記。
    const stack: number[] = [];
    let unmatched = 0;
    for (const m of marks) {
      if (m.canClose && stack.length > 0) stack.pop();
      else if (m.canOpen) stack.push(m.pos);
      else unmatched++;
    }
    if (unmatched + stack.length > 0) {
      out.push({ line: idx + 1, text: rawLines[idx] });
    }
  });

  return out;
}
