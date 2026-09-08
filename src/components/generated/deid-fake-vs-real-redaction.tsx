import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EyeOff, Trash2, Eye, Check, Clipboard } from 'lucide-react';

type Mode = 'fake' | 'real';

/**
 * 區塊 1「畫面呈現」——結構上刻意不接受 `mode` 這個概念。
 * 這個內部函式沒有任何參數，內容完全寫死，因此無法在兩種模式下產生差異，
 * 用程式結構本身（而非人工檢查）保證「兩種遮蔽模式下畫面必須位元組級相同」。
 */
function RedactedDocumentLine() {
  return (
    <div
      className="rounded-md px-3 py-2.5 text-sm"
      style={{
        fontFamily: 'var(--font-mono)',
        background: 'var(--surface-card)',
        color: 'var(--text-body)',
      }}
    >
      委任人：
      <span className="relative inline-block align-baseline">
        <span className="invisible">王小明</span>
        <span
          className="absolute inset-0 rounded-[2px]"
          style={{ background: 'var(--neutral-900, #000)' }}
          aria-hidden="true"
        />
      </span>
      　身分證：
      <span className="relative inline-block align-baseline">
        <span className="invisible">A123456789</span>
        <span
          className="absolute inset-0 rounded-[2px]"
          style={{ background: 'var(--neutral-900, #000)' }}
          aria-hidden="true"
        />
      </span>
    </div>
  );
}

export default function DeidFakeVsRealRedaction() {
  const [mode, setMode] = useState<Mode>('fake');
  const [flightKey, setFlightKey] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setFlightKey((k) => k + 1);
  }, [mode]);

  const isFake = mode === 'fake';

  return (
    <div className="not-prose space-y-3 text-sm">
      {/* 切換鈕 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('fake')}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            border: `1px solid ${isFake ? 'var(--warning-500)' : 'var(--border-default)'}`,
            background: isFake ? 'var(--warning-50)' : 'transparent',
            color: isFake ? 'var(--warning-500)' : 'var(--text-body)',
          }}
        >
          <EyeOff size={14} />
          假遮蔽（畫黑框）
        </button>
        <button
          type="button"
          onClick={() => setMode('real')}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            border: `1px solid ${!isFake ? 'var(--success-500)' : 'var(--border-default)'}`,
            background: !isFake ? 'var(--success-50)' : 'transparent',
            color: !isFake ? 'var(--success-500)' : 'var(--text-body)',
          }}
        >
          <Trash2 size={14} />
          真遮蔽（移除文字指令）
        </button>
      </div>

      {/* 區塊 1：畫面呈現 —— 兩模式共用同一份無 mode 的內部元件 */}
      <div>
        <p className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          畫面呈現
        </p>
        <RedactedDocumentLine />
      </div>

      {/* 區塊 2：內容串流 */}
      <div>
        <p className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          內容串流
        </p>
        <div
          className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-md p-3 text-xs"
          style={{ background: 'var(--surface-sunken)', fontFamily: 'var(--font-mono)', color: 'var(--text-body)' }}
        >
          <span>(委任人：) Tj</span>
          <span
            className="inline-flex items-center gap-1 rounded-[2px] px-1"
            style={
              isFake
                ? { background: 'var(--warning-50)', color: 'var(--warning-500)' }
                : { color: 'var(--text-muted)', textDecoration: 'line-through' }
            }
          >
            (王小明) Tj
            {isFake ? <Eye size={12} /> : <Check size={12} style={{ color: 'var(--success-500)' }} />}
          </span>
          <span>(　身分證：) Tj</span>
          <span
            className="inline-flex items-center gap-1 rounded-[2px] px-1"
            style={
              isFake
                ? { background: 'var(--warning-50)', color: 'var(--warning-500)' }
                : { color: 'var(--text-muted)', textDecoration: 'line-through' }
            }
          >
            (A123456789) Tj
            {isFake ? <Eye size={12} /> : <Check size={12} style={{ color: 'var(--success-500)' }} />}
          </span>
          <span>2 re f</span>
        </div>
      </div>

      {/* 中段：複製貼上連接視覺 */}
      <div className="relative h-12">
        {!prefersReducedMotion ? (
          <motion.div
            key={flightKey}
            initial={{ top: 0, left: '15%', opacity: 0 }}
            animate={{ top: [0, -6, 40], left: ['15%', '50%', '85%'], opacity: [0, 1, 1] }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium"
            style={{
              background: 'var(--surface-card)',
              border: `1px solid ${isFake ? 'var(--warning-500)' : 'var(--success-500)'}`,
              color: isFake ? 'var(--warning-500)' : 'var(--success-500)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Clipboard size={12} />
            {isFake ? '王小明…' : '（空）'}
          </motion.div>
        ) : (
          <div
            className="absolute inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium"
            style={{
              top: 40,
              left: '85%',
              transform: 'translateX(-50%)',
              background: 'var(--surface-card)',
              border: `1px solid ${isFake ? 'var(--warning-500)' : 'var(--success-500)'}`,
              color: isFake ? 'var(--warning-500)' : 'var(--success-500)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Clipboard size={12} />
            {isFake ? '王小明…' : '（空）'}
          </div>
        )}
      </div>

      {/* 區塊 3：重新抽取文字結果 */}
      <div>
        <p className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          重新抽取文字結果
        </p>
        <div
          className="rounded-md p-3 text-sm"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-body)',
          }}
        >
          {isFake ? (
            <p>
              抽取結果：委任人：
              <span style={{ color: 'var(--warning-500)' }}>王小明</span>
              　身分證：
              <span style={{ color: 'var(--warning-500)' }}>A123456789</span>
            </p>
          ) : (
            <p>
              抽取結果：委任人：
              <span style={{ color: 'var(--success-500)' }}>（空）</span>
              　身分證：
              <span style={{ color: 'var(--success-500)' }}>（空）</span>
            </p>
          )}
        </div>
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          這條測試通過之前，模型準確率再高都沒有意義
        </p>
      </div>
    </div>
  );
}
