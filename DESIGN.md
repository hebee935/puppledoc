# `@puppledoc/space-ui` — Design Spec

레이아웃·디자인 토큰. 수치는 그대로 CSS로 옮겨 쓸 수 있도록 확정값으로 적는다. (레퍼런스: Lumen API Docs mockup)

> **톤**: warm-neutral dual-tone. 사이드바/docs는 off-white, 테스트 패널은 warm-near-black. 단일 accent = warm lime/amber.

---

## 1. 레이아웃

### 1.1 Shell

```
grid-template-columns: var(--sidebar-w) 1fr var(--test-w);
height: 100vh;
overflow: hidden;
```

- `--sidebar-w: 280px`
- `--test-w: 440px`

Tweak 옵션(v0.2+):
- `data-sidebar="right"` → 순서 뒤집기.
- `data-panels="stacked"` → 테스트 패널을 fixed 오른쪽으로 빼고 토글.

### 1.2 Sidebar (`280px`)

- `brand` 상단 16/18 padding, 26px square mark (고딕+gradient dot).
- `searchbar` 10/12 margin, 7/10 padding, `⌘K` kbd 칩.
- `nav-group` 접이식(chevron 회전). `nav-item`에는 method pill + label, active 시 dark bg.
- `sidebar-foot`: OpenAPI / MCP export 버튼 두 개.

### 1.3 Docs column

- `header` 24/40 padding, linear-gradient fade, title 24px/600, version chip mono 11px.
- `endpoint` 블록: `padding: 20px 40px`, 구분선 `--line`.
- `ep-path`는 JetBrains Mono 14px, path var(`{id}`)는 muted.
- `section-head`: 11px/600/uppercase, 오른쪽 자동 1px 라인 채움.

### 1.4 Test panel (`440px`, dark)

- 배경 `--panel`, 좌측 보더 `--line-dark`.
- `test-head`: method chip + path + server select.
- `tabs`: Params / Body / Auth, active 탭은 **accent underline**.
- `code-switcher`: curl/fetch/axios, active 탭은 code block 배경(`oklch(14% 0.008 70)`)과 이어 붙음.
- `test-foot`: primary "Send Request" + ghost "Copy curl".

---

## 2. 색상 토큰 (OKLCH)

모든 색은 `:root`에 변수로. `[data-theme="dark"]`는 v0.3 이후.

```css
:root {
  /* Surfaces */
  --bg:        oklch(98.5% 0.004 80);
  --panel:     oklch(16% 0.008 70);   /* test panel bg */
  --panel-2:   oklch(19% 0.009 70);   /* inputs, buttons */
  --panel-3:   oklch(23% 0.01 70);    /* hover */

  /* Ink */
  --ink:           oklch(22% 0.012 70);
  --ink-muted:     oklch(46% 0.01 70);
  --ink-faint:     oklch(62% 0.008 70);
  --ink-dark:        oklch(96% 0.005 80);
  --ink-dark-muted:  oklch(72% 0.008 70);
  --ink-dark-faint:  oklch(52% 0.008 70);

  /* Lines */
  --line:         oklch(92% 0.005 80);
  --line-strong:  oklch(85% 0.008 80);
  --line-dark:    oklch(28% 0.01 70);
  --line-dark-2:  oklch(33% 0.011 70);

  /* Accent (primary action, active tab) */
  --accent:      oklch(78% 0.17 95);
  --accent-ink:  oklch(28% 0.1 90);

  /* Status */
  --ok:      oklch(72% 0.14 155);
  --warn:    oklch(78% 0.15 75);
  --danger:  oklch(66% 0.18 27);
  --info:    oklch(70% 0.13 240);
  --purple:  oklch(68% 0.16 295);

  /* Method colors */
  --m-get:      oklch(72% 0.14 155);  /* green */
  --m-post:     oklch(70% 0.13 240);  /* blue  */
  --m-patch:    oklch(78% 0.15 75);   /* amber */
  --m-put:      oklch(72% 0.14 45);   /* orange */
  --m-delete:   oklch(66% 0.18 27);   /* red */
  --m-options:  oklch(68% 0.1 295);   /* purple */
  --m-wss:      oklch(78% 0.17 95);   /* accent-like */
  --m-wss-up:   oklch(70% 0.13 240);  /* send = blue */
  --m-wss-down: oklch(78% 0.17 95);   /* recv = amber */
}
```

### 2.1 상태 코드 chip (Responses)

| Prefix | Var       | 라벨    |
|--------|-----------|---------|
| `2xx`  | `--ok`    | Success |
| `3xx`  | `--info`  | Redirect|
| `4xx`  | `--warn`  | Error   |
| `5xx`  | `--danger`| Error(text: white) |

---

## 3. 타이포그래피

```css
--font-sans: 'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
```

`font-feature-settings: "ss01", "cv11"` for Inter Tight.

| 용도 | size/weight | family |
|---|---|---|
| docs title | 24 / 600 (-0.02em) | sans |
| endpoint title | 18 / 600 | sans |
| endpoint path | 14 / 500 | mono |
| body | 14 / 400 | sans |
| section-head | 11 / 600 / uppercase / .06em | sans |
| nav item | 13 / 400 | sans |
| method pill | 9.5 / 700 / .04em | mono |
| kbd | 11 / 400 | mono |
| code block | 12 / 400 / 1.6 | mono |

---

## 4. Method Pill

```css
.method-pill {
  font: 700 9.5px/1 var(--font-mono);
  letter-spacing: .04em;
  padding: 2px 5px;
  border-radius: 3px;
  min-width: 42px;
  text-align: center;
  background: var(--color);
  color: oklch(18% 0.01 70);
}
.method-pill[data-method="GET"]    { --color: var(--m-get); }
.method-pill[data-method="POST"]   { --color: var(--m-post); }
.method-pill[data-method="PATCH"]  { --color: var(--m-patch); }
.method-pill[data-method="PUT"]    { --color: var(--m-put); }
.method-pill[data-method="DELETE"] { --color: var(--m-delete); }
.method-pill[data-method="OPTIONS"]{ --color: var(--m-options); }
.method-pill[data-method="WSS"]    { --color: var(--m-wss); }
.method-pill[data-method="WSS↑"]   { --color: var(--m-wss-up);   min-width: 44px; }
.method-pill[data-method="WSS↓"]   { --color: var(--m-wss-down); min-width: 44px; }
```

- `↑` = client → server (send). 파란색.
- `↓` = server → client (recv). 앰버(accent).

---

## 5. 스키마 트리

- grid: `minmax(0, 2fr) minmax(0, 1fr) minmax(0, 3fr)` (name / type / note+example).
- nested row: `padding-left: 18px; border-left: 2px solid var(--line); margin-left: 4px;`
- `required` 라벨: mono 10px, `--danger`.
- 타입별 컬러:

| type | color |
|---|---|
| string | `oklch(55% 0.12 155)` |
| number | `oklch(55% 0.14 240)` |
| boolean | `oklch(55% 0.14 295)` |
| object | `oklch(55% 0.12 25)` |
| array | `oklch(55% 0.12 75)` |
| default | `--info` |

펼치기/접기: 기본 열림, 누르면 `data-open="false"` → chevron -90°.

---

## 6. 코드 블록 & JSON 뷰어

- 배경 `oklch(14% 0.008 70)`(panel보다 더 어둡게), color `--ink-dark-muted`.
- `white-space: pre`, line-height 1.6.
- 라인 번호 `width: 22px; opacity: .45; text-align: right; padding-right: 10px;`
- Copy 버튼 `position: absolute; right: 10px; top: 10px;`.
- 토큰 컬러 (JSON/curl):
  - `--tok-cmd` = accent (`curl`, 함수명)
  - `--tok-flag` = info (`-X`, `-H`)
  - `--tok-str` = `oklch(75% 0.12 155)`
  - `--tok-key` = `oklch(80% 0.1 30)`
  - `--tok-num` = `oklch(78% 0.14 295)`
  - `--tok-kw` = `oklch(72% 0.14 295)` (true/false/null)
  - `--tok-punct` = `--ink-dark-faint`

하이라이터는 **regex 기반 10줄**이면 충분 — Prism/Shiki 금지(번들 크기).

---

## 7. WSS 테스터 디테일

### 7.1 연결 상태 점

```css
.wss-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-dark-faint); }
.wss-dot[data-state="connected"] {
  background: var(--ok);
  box-shadow: 0 0 0 3px oklch(72% 0.14 155 / 0.2);
  animation: pulse-dot 2s infinite;
}
.wss-dot[data-state="connecting"] { background: var(--warn); }
.wss-dot[data-state="error"]       { background: var(--danger); }
```

### 7.2 프레임 로그

- `grid-template-columns: 14px 1fr`, gap 8.
- send: `background: oklch(20% 0.03 240 / 0.5); border: 1px solid oklch(30% 0.06 240);`
- recv: `background: oklch(20% 0.015 80 / 0.5); border: 1px solid oklch(30% 0.02 80);`
- system(회색 이탤릭): connect/close 이벤트.
- 각 프레임 위 meta: `dir · HH:mm:ss · NNB` mono 10px.

### 7.3 Compose

- textarea min-height 64, mono 11.5.
- Send 버튼은 옆에 붙은 **세로 긴 primary 버튼**(아이콘만).
- 템플릿 칩(선택): `subscribe`, `ping`, `typing` — 클릭 시 textarea 프리필.

### 7.4 이벤트 단일 페이지 (핵심)

`@Receive`/`@Send`로 정의된 **개별 이벤트 = 하나의 endpoint**로 취급. Sidebar에 이벤트마다 행이 생긴다. 선택 시:

- Docs column: path 자리에 `type: "event.name"`, `eventDir` 배지, Frame Schema, Example Frame, Expected Reply(있으면), JS 핸들러 스니펫.
- Test column: WS 단일-이벤트 테스터(연결 + 이 이벤트만 주고받음).

`send` 이벤트: textarea에서 Send → 소켓으로 전송, reply 있으면 표시.
`recv` 이벤트: 연결 후 해당 type만 필터해서 타임라인에 표시(필요 시 "Simulate push" — 서버 mock 모드일 때만).

---

## 8. 상호작용 디테일

- 사이드바 active: `background: oklch(22% 0.012 70); color: oklch(96% 0.005 80); method-pill { filter: saturate(1.15); }`
- 탭 hover/active: active는 `color: var(--accent); border-bottom: 2px solid var(--accent);`
- 모든 transition은 `.12s`—.24s ease. `cubic-bezier(.2,.8,.2,1)`은 stacked 패널 슬라이드 인에만.
- 토스트(우하단 1.8s): `oklch(22% 0.012 70)` bg, `oklch(96% 0.005 80)` text.
- 커맨드 팔레트: `place-items: flex-start center; padding-top: 12vh; backdrop-filter: blur(4px);` — ⌘K.
- Authorize 모달: ⌥A. 입력은 `--bg` 배경 + `--line-strong` 보더 + focus 시 `border: var(--ink)`.

---

## 9. 아이콘

Lucide-react에서 **필요한 것만 개별 import** (tree-shake):
`Search`, `ChevronDown`, `Lock`, `Key`, `Copy`, `Download`, `Zap`, `Play`, `Square` (stop), `Send`, `ArrowLeft`, `ArrowRight`.

크기 14/12px 두 종(`.ico`, `.ico-sm`), `stroke-width: 1.75`, `currentColor`.

---

## 10. 스크롤바

```css
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
/* light area */
::-webkit-scrollbar-thumb { background: oklch(88% 0.005 80); border-radius: 5px; border: 2px solid transparent; background-clip: padding-box; }
/* dark area (test panel, code) */
.test ::-webkit-scrollbar-thumb { background: oklch(30% 0.01 70); /* same recipe */ }
```

---

## 11. Density tweak

```css
[data-density="compact"] { --row-h: 28px; --pad-y: 12px; }
[data-density="compact"] .endpoint { padding: 16px 32px; gap: 10px; }
```

기본 `comfortable`. 우하단 tweaks 패널은 v0.2 이후.

---

## 12. 접근성 체크리스트

- 키보드만으로 endpoint 네비 가능(`Tab` + `Enter`, `ArrowUp/Down`으로 nav 이동).
- `⌘K` 포커스는 input, `ESC`로 닫기.
- Method pill에 `aria-label="HTTP method GET"` 등 명시.
- 색만으로 의미 전달 금지 — status chip에 상태 텍스트("Success" / "Error") 병기.
- 모든 code block은 `role="region"` + "Copy" 버튼 별도 포커스 가능.
- Focus ring: `outline: 2px solid var(--accent); outline-offset: 2px;` (커스텀하되 제거 금지).
