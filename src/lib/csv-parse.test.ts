import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./csv-parse.ts";

test("基本逗號分隔", () => {
  assert.deepEqual(parseCsv("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("吃掉 UTF-8 BOM（Excel 匯出的 CSV 幾乎都有）", () => {
  // 不處理的話第一欄的欄名會變成 "﻿VD"，對照欄位時對不起來。
  assert.deepEqual(parseCsv("﻿VD,ID\n0.6,1.2"), [["VD", "ID"], ["0.6", "1.2"]]);
});

test("引號內的逗號與換行不切欄", () => {
  assert.deepEqual(parseCsv('a,"b,c"\n"多\n行",d'), [["a", "b,c"], ["多\n行", "d"]]);
});

test("兩個連續引號代表一個引號字元", () => {
  assert.deepEqual(parseCsv('"說""話"",完"'), [['說"話",完']]);
});

test("CRLF 與結尾換行", () => {
  assert.deepEqual(parseCsv("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
});

test("空欄位保留，不會被摺疊", () => {
  assert.deepEqual(parseCsv("a,,c\n,,"), [["a", "", "c"], ["", "", ""]]);
});

test("空字串回空陣列", () => {
  assert.deepEqual(parseCsv(""), []);
  assert.deepEqual(parseCsv("\n"), []);
});

test("各列欄數不同時照原樣回傳（補齊交給呈現層）", () => {
  assert.deepEqual(parseCsv("a,b,c\n1"), [["a", "b", "c"], ["1"]]);
});
