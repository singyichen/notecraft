import { test } from "node:test";
import assert from "node:assert/strict";
import remarkNotecraftDirectives from "./remark-notecraft-directives.ts";

// mdast 節點結構鬆散，測試裡用最小化的形狀描述本 transform 會碰到的欄位。
interface TestNode {
  type: string;
  name?: string;
  attributes?: Record<string, string | null> | null;
  children?: TestNode[];
  value?: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
    directiveLabel?: boolean;
  };
}

/** 把字串陣列組成 `:::choices` 容器內的那份 Markdown 清單（listItem > paragraph > text）。 */
function list(items: string[]): TestNode {
  return {
    type: "list",
    children: items.map((s) => ({
      type: "listItem",
      children: [{ type: "paragraph", children: [{ type: "text", value: s }] }],
    })),
  };
}

function choices(answer: string | null, items: string[], extra: TestNode[] = []): TestNode {
  return {
    type: "containerDirective",
    name: "choices",
    attributes: answer === null ? {} : { answer },
    children: [list(items), ...extra],
  };
}

/** 跑 transform（回傳被就地改寫的 root）並收集 console.warn 訊息。 */
function run(node: TestNode): { root: TestNode; warns: string[] } {
  const root: TestNode = { type: "root", children: [node] };
  const warns: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warns.push(args.map((a) => String(a)).join(" "));
  };
  try {
    remarkNotecraftDirectives()(root as never, { path: "test.mdx" });
  } finally {
    console.warn = original;
  }
  return { root, warns };
}

function className(node: TestNode | undefined): string[] {
  const cls = node?.data?.hProperties?.className;
  return Array.isArray(cls) ? (cls as string[]) : [];
}

/** 遞迴收集節點下的所有文字，用來比對選項內容。 */
function textOf(node: TestNode | undefined): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.children || []).map(textOf).join("");
}

/** 取出每個 `<li>` 的字母、文字與是否為正解。 */
function readOptions(container: TestNode) {
  return (container.children || []).map((li) => {
    const parts = li.children || [];
    const key = parts.find((p) => className(p).includes("nc-choice__key"));
    const body = parts.find((p) => className(p).includes("nc-choice__text"));
    const sr = parts.find((p) => className(p).includes("nc-choice__sr"));
    return {
      key: textOf(key),
      text: textOf(body),
      correct: className(li).includes("nc-choice--correct"),
      srLabel: textOf(sr),
    };
  });
}

test("依清單順序指派 A/B/C/D 字母", () => {
  const node = choices("A", ["第一", "第二", "第三", "第四"]);
  const { warns } = run(node);

  assert.deepEqual(readOptions(node).map((o) => o.key), ["A", "B", "C", "D"]);
  assert.deepEqual(readOptions(node).map((o) => o.text), ["第一", "第二", "第三", "第四"]);
  assert.deepEqual(warns, []);
});

test("容器渲染為 ul.nc-choices，每個選項是 li.nc-choice", () => {
  const node = choices("A", ["第一", "第二"]);
  run(node);

  assert.equal(node.data?.hName, "ul");
  assert.deepEqual(className(node), ["nc-choices"]);
  assert.deepEqual(
    (node.children || []).map((li) => li.data?.hName),
    ["li", "li"],
  );
  assert.ok(className(node.children?.[0]).includes("nc-choice"));
});

test("answer 指到的那一項標為正解，其餘不標", () => {
  const node = choices("B", ["第一", "第二", "第三", "第四"]);
  const { warns } = run(node);

  assert.deepEqual(readOptions(node).map((o) => o.correct), [false, true, false, false]);
  assert.deepEqual(warns, []);
});

test("正解項附帶視覺隱藏的「正解」文字供螢幕閱讀器朗讀", () => {
  const node = choices("C", ["第一", "第二", "第三"]);
  run(node);

  assert.deepEqual(readOptions(node).map((o) => o.srLabel), ["", "", "正解"]);
});

test("answer 支援逗號分隔的複選，且大小寫不分", () => {
  const node = choices("b, d", ["第一", "第二", "第三", "第四"]);
  const { warns } = run(node);

  assert.deepEqual(readOptions(node).map((o) => o.correct), [false, true, false, true]);
  assert.deepEqual(warns, []);
});

test("answer 字母超出選項數 → warn 並退化為不標記，清單仍照常渲染", () => {
  const node = choices("E", ["第一", "第二", "第三", "第四"]);
  const { warns } = run(node);

  assert.deepEqual(readOptions(node).map((o) => o.correct), [false, false, false, false]);
  assert.deepEqual(readOptions(node).map((o) => o.key), ["A", "B", "C", "D"]);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /:::choices/);
  assert.match(warns[0], /E/);
});

test("缺 answer 屬性 → warn 並退化為不標記", () => {
  const node = choices(null, ["第一", "第二"]);
  const { warns } = run(node);

  assert.deepEqual(readOptions(node).map((o) => o.correct), [false, false]);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /:::choices/);
});

test("容器內沒有清單 → warn 並退化為一般區塊，內容不消失", () => {
  const node: TestNode = {
    type: "containerDirective",
    name: "choices",
    attributes: { answer: "A" },
    children: [{ type: "paragraph", children: [{ type: "text", value: "忘了寫清單" }] }],
  };
  const { warns } = run(node);

  assert.equal(node.data?.hName, "div");
  assert.deepEqual(className(node), ["nc-choices", "nc-choices--degraded"]);
  assert.match(textOf(node), /忘了寫清單/);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /:::choices/);
});

test("清單之外的雜項子節點 → warn 並置於容器底部，內容不消失", () => {
  const node = choices("A", ["第一", "第二"], [
    { type: "paragraph", children: [{ type: "text", value: "多餘的說明" }] },
  ]);
  const { warns } = run(node);

  assert.match(textOf(node), /多餘的說明/);
  assert.equal(warns.length, 1);
  assert.match(warns[0], /:::choices/);
});

test("選項文字中的巢狀行內指令照常處理（:badge 不會被還原成字面）", () => {
  const node: TestNode = {
    type: "containerDirective",
    name: "choices",
    attributes: { answer: "A" },
    children: [
      {
        type: "list",
        children: [
          {
            type: "listItem",
            children: [
              {
                type: "paragraph",
                children: [
                  { type: "text", value: "含標籤 " },
                  {
                    type: "textDirective",
                    name: "badge",
                    attributes: { variant: "success" },
                    children: [{ type: "text", value: "新" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  run(node);

  const inner = readOptions(node)[0];
  assert.match(inner.text, /含標籤/);
  assert.ok(!inner.text.includes(":badge"), "badge 應已被處理，而非還原為字面文字");
});
