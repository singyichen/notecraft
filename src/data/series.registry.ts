// ── 系列硬編碼註冊表（Main-project only）──
// 作者私人的系列定義，供無 NOTECRAFT_NOTES_DIR 時使用（主專案本體）。
// viewer 模式（有 env）走 <notesDir>/.notecraft/series.json，不會讀這裡。
//
// npm publish 時本檔會被 .npmignore 排除（見 docs/notecraft-npx-viewer.md §4.3.3、§10.2），
// 因此外部 viewer 專案 dynamic import 失敗會 fallback 到空陣列。

import type { SeriesDef } from "@/data/series";

export const SERIES: SeriesDef[] = [
  {
    id: "pm-basics",
    title: "專案管理筆記",
    eyebrow: "PROJECT MANAGEMENT",
    description:
      "從「在管什麼」到「怎麼做、誰來做、如何落地」—— 一條從核心觀念到團隊權責與落地工具的專案管理入門路徑。",
    accent: "navy",
    icon: "target",
    slugs: [
      "專案管理系列",
      "專案-vs-產品",
      "waterfall-vs-agile",
      "role-responsibility-rr",
      "waterfall-sdlc",
      "project-mgmt-tool-專案管理工具",
      "專案管理系列第六章-需求分析",
      "專案管理系列第七章-規格撰寫",
    ],
  },
  {
    id: "ai-consultant-notes",
    title: "AI 顧問陪跑筆記",
    eyebrow: "AI CONSULTANT NOTES",
    description:
      "AI 顧問陪跑筆記：紀錄與 AI 顧問 Danny 進行 Workshop 期間的 AI 技術交流與專案討論，包含對 AI 技術的理解、實驗過程、專案規劃與管理等面向的內容，作為未來 AI 專案參考與學習的資源。",
    accent: "navy",
    icon: "code",
    slugs: [
      "建立-bump-prd-hook-的認知調整歷程",
      "ssr-專案dutymate-ai-憲章與-workflow-設計",
      "五個-lang-函式庫還是服務",
      "rag-embedding-選型-mistral-與-voyage",
      "勞動法遵決策支援系統-poc-範圍與技術選型",
      "勞動法遵決策支援系統-poc-任務拆解與分工",
      "勞動法遵決策支援系統-poc-l1-l3-檢索閉環",
      "非結構化文件-pii-去識別化",
    ],
  },
  {
    id: "ai-consultant-workshop",
    title: "AI 顧問陪跑 Workshop 會議紀錄",
    eyebrow: "AI CONSULTANT WORKSHOP",
    description:
      "AI 顧問陪跑 Workshop 會議紀錄：紀錄與 AI 顧問 Danny Workshop 會議中的 AI 技術交流與專案討論，包含對 AI 技術的理解、實驗過程、專案規劃與管理等面向的內容，作為未來 AI 專案參考與學習的資源。",
    accent: "navy",
    icon: "bolt",
    slugs: [
      "ai-顧問陪跑-workshop-20260611",
      "ai-顧問陪跑-workshop-20260618",
      "ai-顧問陪跑-workshop-20260625",
      "ai-顧問陪跑-workshop-20260702",
    ],
  },
  {
    id: "ai-content-generation-demo",
    title: "AI 內容生成演示系列",
    eyebrow: "AI CONTENT GENERATION DEMO",
    description:
      "AI 內容生成演示系列：展示 AI 在內容生成方面的應用與實驗，包含文本、圖像、音頻等多種媒介的生成技術，作為未來 AI 內容生成參考與學習的資源。",
    accent: "navy",
    icon: "layers",
    slugs: ["ai-內容生成演示系列-訂單狀態機", "ai-內容生成演示系列-複利效應"],
  },
  {
    id: "specification-writing-demo",
    title: "規格書撰寫演示系列",
    eyebrow: "SPECIFICATION WRITING DEMO",
    description:
      "規格書撰寫演示系列:展示在規格書撰寫方面的流程與方法，作為未來規格書撰寫參考與學習的資源。",
    accent: "navy",
    icon: "layers",
    slugs: [
      "規格書撰寫-what-寫什麼",
      "規格書撰寫-how-怎麼寫",
      "規格書撰寫-where-寫在哪",
    ],
  },
  {
    id: "trendlink-infra-runbook",
    title: "Trendlink 系統建置手冊",
    eyebrow: "TRENDLINK INFRA RUNBOOK",
    description:
      "自建系統從零到可運作的基礎架構建置紀錄：每一項配置「為什麼這樣設」的決策依據，以及實際進 console／VM 的操作步驟（Runbook）。目前涵蓋 GCP 基礎架構，後續增補 Cloud SQL 等資料層建置。",
    accent: "navy",
    icon: "layers",
    // 章節皆為 private 筆記（src/content/notes/private/，已於 .gitignore 排除）：
    // 本機 dev 看得到；正式站因筆記不存在，此系列會被「零章節即略過」的判斷濾掉。
    slugs: [
      "private/trendlink-系統-gcp-基礎架構設定與建置手冊",
      "private/trendlink-系統-cloud-sql-postgresql-pgvector-設定與建置手冊",
    ],
  },
  {
    id: "trendlink-proposal",
    title: "聯和趨動內部專案提案",
    eyebrow: "TRENDLINK PROPOSAL",
    description: "提案系列：展示於公司內部相關專案的提案，作為個人經歷的紀錄。",
    accent: "navy",
    icon: "bookOpen",
    slugs: [
      "trendlink-內部客戶與業務流程整合系統提案草稿",
      "trendlink-ai-入門工作坊提案草稿",
    ],
  },
  {
    id: "tech-books",
    title: "技術書籍系列",
    eyebrow: "TECHNICAL BOOKS",
    description:
      "收錄研讀中的技術書籍筆記，包含書目資訊、內容摘要與線上資源連結，依主題（資料科學／機器學習）分類，作為技術學習與延伸筆記的參考基礎。",
    accent: "navy",
    icon: "bookOpen",
    slugs: [
      "技術書籍系列",
      "python-data-science-handbook",
      "machine-learning-with-pytorch-and-scikit-learn",
      "fundamentals-of-microelectronics",
    ],
  },
  {
    id: "ml-practicum",
    title: "機器學習實作系列",
    eyebrow: "MACHINE LEARNING PRACTICUM",
    description:
      "碩士課程「機器學習實作」的課程筆記系列，16 週涵蓋機器學習概論、Python 資料科學工具鏈、傳統機器學習與深度學習（PyTorch），部分週次對應《Python Data Science Handbook》與《Machine Learning with PyTorch and Scikit-Learn》。",
    accent: "navy",
    icon: "code",
    slugs: [
      "機器學習實作系列",
      "機器學習實作系列第1週-機器學習簡介",
      "機器學習實作系列第2週-python基礎",
      "機器學習實作系列第3週-numpy與pandas",
      "機器學習實作系列第5週-matplotlib與seaborn資料視覺化",
      "機器學習實作系列第6週-scikit-learn機器學習",
      "機器學習實作系列第7週-資料前處理與模型評估",
      "機器學習實作系列第9週-期中考",
      "機器學習實作系列第10週-多層神經網路與深度學習",
      "機器學習實作系列第11週-pytorch深度學習",
      "機器學習實作系列第12週-分類與應用",
      "機器學習實作系列第13週-降維與應用",
      "機器學習實作系列第14週-回歸與應用",
      "機器學習實作系列第15週-分群與應用",
      "機器學習實作系列第16週-期末專案",
    ],
  },
];
