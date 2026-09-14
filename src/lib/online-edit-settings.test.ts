import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRepoInput,
  loadSettings,
  saveSettings,
  clearSettings,
  type OnlineEditSettings,
} from "./online-edit-settings.ts";

// 不寫 `implements Storage`：DOM 的 Storage 型別帶一個 `[name: string]: any` index
// signature，class 要滿足它得額外宣告一個 any 型別成員，不值得為了型別合規引入 any。
// 指派給 globalThis.localStorage 時用 `as Storage` 斷言即可，成員都對得上。
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage() as Storage;
});

test("parseRepoInput 解析 owner/repo 格式", () => {
  assert.deepEqual(parseRepoInput("singyichen/notecraft"), { owner: "singyichen", repo: "notecraft" });
});

test("parseRepoInput 對格式錯誤回傳 null", () => {
  assert.equal(parseRepoInput("not-a-repo"), null);
  assert.equal(parseRepoInput("too/many/slashes"), null);
  assert.equal(parseRepoInput(""), null);
});

test("loadSettings 在沒有存過設定時回傳 null", () => {
  assert.equal(loadSettings(), null);
});

test("saveSettings 之後 loadSettings 能拿回同樣的值", () => {
  const settings: OnlineEditSettings = {
    owner: "singyichen",
    repo: "notecraft",
    branch: "main",
    pathPrefix: "src/content/notes",
    token: "github_pat_xxx",
  };
  saveSettings(settings);
  assert.deepEqual(loadSettings(), settings);
});

test("loadSettings 在 branch / pathPrefix 沒存過時給預設值", () => {
  localStorage.setItem("notecraft:onlineEdit:owner", "singyichen");
  localStorage.setItem("notecraft:onlineEdit:repo", "notecraft");
  localStorage.setItem("notecraft:onlineEdit:token", "t");
  const settings = loadSettings();
  assert.equal(settings?.branch, "main");
  assert.equal(settings?.pathPrefix, "");
});

test("clearSettings 之後 loadSettings 回傳 null", () => {
  saveSettings({
    owner: "a",
    repo: "b",
    branch: "main",
    pathPrefix: "",
    token: "t",
  });
  clearSettings();
  assert.equal(loadSettings(), null);
});
