/**
 * 修正 @aiden0z/pptx-renderer 1.3.0 對 `normAutofit` 文字框的縮放比例。
 *
 * PowerPoint 的「溢出時縮小文字」是把字級一路調小、讓文字在**原本的寬度內重新換行**，直到高度
 * 放得下為止。渲染器 1.3.0 在內容超出高度時，卻拿「容器寬度 ÷ 整段不換行的寬度」當縮放比例——
 * 等於把整段縮到一行放得下。四行 20pt 的段落會被縮成 33% 的一行小字，與原稿差很遠
 *（2026-10-01 用作者的自我介紹投影片第 8 張實測）。
 *
 * 渲染器的做法是：shape 容器（尺寸 W×H）裡放 overflow hidden 的文字本體，本體設 `width: 100/s %`、
 * `height: 100/s %`、`transform: scale(s)`、`transform-origin: top left`——放大版面再整體縮回去，
 * 效果等同字級縮成 s 倍並在全寬內換行。這個形狀沒有錯，錯的只有 s 的算法。所以這裡沿用同一個
 * 形狀，只把 s 換成「讓內容高度剛好放得下的最大值」（二分搜尋，誤差 < 1%）。
 *
 * 只動渲染器自己縮過的節點：有 `scale(<1)`、原點 top left、而且自己是 overflow hidden 的文字本體。
 * 其他帶 transform 的節點（旋轉、翻轉、整張投影片的縮放）一律不碰。
 *
 * 升級渲染器時先確認上游是否已修（看 CHANGELOG 的 autofit 條目）；修了就把這支與它的呼叫點一起拿掉。
 */
export function fixPptxAutofit(slideRoot: HTMLElement): number {
  let touched = 0;
  const bodies = slideRoot.querySelectorAll<HTMLElement>('div[style*="scale("]');
  for (const body of bodies) {
    const match = /^scale\(([\d.]+)\)$/.exec(body.style.transform.trim());
    if (!match) continue;
    const current = Number(match[1]);
    if (!(current < 1)) continue;
    // 瀏覽器讀回來的值會被正規化（Chrome 把 "top left" 存成 "left top"），兩種寫法都認
    const origin = body.style.transformOrigin.replace(/\s+/g, " ").trim();
    if (origin !== "top left" && origin !== "left top") continue;
    // normAutofit 的文字本體自己是 overflow hidden（渲染器就是這樣標的），外層的 shape 容器
    // 才是 W×H 的框；本體的寬高是以百分比寫的（100/s %），沿用同一種寫法。
    if (getComputedStyle(body).overflowY !== "hidden") continue;
    const box = body.parentElement;
    if (!box) continue;
    const boxW = box.clientWidth;
    const boxH = box.clientHeight;
    if (!boxW || !boxH) continue;

    const apply = (s: number) => {
      body.style.width = `${100 / s}%`;
      body.style.height = `${100 / s}%`;
      body.style.transform = `scale(${s})`;
    };
    // 本體高度固定為 H/s，所以 scrollHeight ≥ H/s；內容放得下 ⇔ scrollHeight·s 沒有超過 H。
    const fits = (s: number) => {
      apply(s);
      return body.scrollHeight * s <= boxH + 0.5 && body.scrollWidth * s <= boxW + 0.5;
    };

    let best: number;
    if (fits(1)) {
      best = 1;
    } else {
      let lo = current;
      let hi = 1;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      best = lo;
      apply(best);
    }
    if (Math.abs(best - current) > 0.005) touched++;
  }
  return touched;
}
