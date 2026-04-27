# `@puppledoc/nestjs-api-reference` — Implementation Spec

NestJS 플러그인. `@nestjs/swagger`가 만드는 OpenAPI 3.1 문서에 WebSocket 이벤트 메타를 덧붙여(`x-websocket` extension), 번들된 UI에서 **REST + WS**를 한 화면에서 문서화하고 **실제 요청**을 테스트한다.

- 배포: `@puppledoc/nestjs-api-reference` (core) + `@puppledoc/space-ui` (정적 번들, core가 내부적으로 서빙)
- 레이아웃/디자인 레퍼런스: `./DESIGN.md`
- 개발 전제: `pnpm`, TypeScript strict, ESM+CJS dual.

---

## 0. 설계 원칙

1. **Small surface** — 퍼블릭 API는 `@Receive`, `@Send`, `PuppleDocModule.setup()` 세 개가 전부. 나머지는 internal.
2. **Mirror SwaggerModule** — Nest 개발자가 기존 지식 그대로 쓸 수 있게 API 모양 그대로 따라간다.
3. **Headless core + static UI** — core는 JSON spec + express static만 책임지고, UI는 번들된 정적 파일(`@puppledoc/space-ui/dist`)을 서빙. UI 교체/커스텀 가능.
4. **실제 요청만** — 시뮬레이션 모드는 v0.1 범위 밖. 브라우저가 실제 fetch/WebSocket을 연다.
5. **No clever metaprogramming** — 데코레이터는 `Reflect.defineMetadata`로 배열 push만. 스캐너가 `DiscoveryService`로 순회.

---

## 1. 레포 구조 (pnpm workspace + Turborepo)

```
space-api/
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── package.json
├── packages/
│   ├── api/                  # @puppledoc/nestjs-api-reference  (core, NestJS 플러그인)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── decorators/
│   │   │   │   ├── receive.decorator.ts
│   │   │   │   └── send.decorator.ts
│   │   │   ├── metadata/
│   │   │   │   ├── keys.ts
│   │   │   │   └── types.ts
│   │   │   ├── scanner/
│   │   │   │   └── ws.scanner.ts
│   │   │   ├── generator/
│   │   │   │   ├── openapi.ts       # @nestjs/swagger 위임 + x-websocket 주입
│   │   │   │   └── schema.ts        # DTO → JSON Schema (class-validator 메타 활용)
│   │   │   ├── module/
│   │   │   │   └── puppledoc.module.ts
│   │   │   └── server/
│   │   │       └── ui-adapter.ts    # express/fastify 정적 서빙
│   │   ├── package.json
│   │   └── tsup.config.ts
│   ├── api-ui/               # @puppledoc/space-ui  (React SPA, 정적 번들)
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── styles/
│   │   │   │   └── tokens.css       # DESIGN.md 토큰
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Docs.tsx
│   │   │   │   └── TestPanel.tsx
│   │   │   ├── pages/
│   │   │   │   ├── RestEndpoint.tsx
│   │   │   │   ├── WssConnection.tsx
│   │   │   │   └── WssEvent.tsx
│   │   │   ├── components/
│   │   │   │   ├── MethodPill.tsx
│   │   │   │   ├── SchemaTree.tsx
│   │   │   │   ├── CodeBlock.tsx
│   │   │   │   ├── JsonView.tsx
│   │   │   │   └── CommandPalette.tsx
│   │   │   ├── runners/
│   │   │   │   ├── rest.ts          # fetch 기반 실제 요청
│   │   │   │   └── ws.ts            # WebSocket 래퍼
│   │   │   ├── codegen/
│   │   │   │   ├── curl.ts
│   │   │   │   ├── fetch.ts
│   │   │   │   └── axios.ts
│   │   │   └── store.ts             # Zustand: 현재 endpoint, token, server
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   └── playground/            # 로컬 개발용 샘플 NestJS 앱 (배포X)
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── chat.gateway.ts
│       │   └── workspaces.controller.ts
│       └── package.json
└── examples/
    └── minimal/               # README에 링크할 최소 예제
```

---

## 2. Core 패키지 (`@puppledoc/nestjs-api-reference`)

### 2.1 퍼블릭 API

```ts
// packages/api/src/index.ts
export { Receive, Send } from './decorators';
export { PuppleDocModule } from './module/puppledoc.module';
export type { PuppleDocOptions, WsEventDirection, WsEventMeta } from './metadata/types';
```

### 2.2 데코레이터

`@Receive`는 게이트웨이 메서드가 **수신**하는 프레임(client → server), `@Send`는 **송신**(server → client). NestJS 관례상 `@SubscribeMessage('msg')` 핸들러 위에 얹힌다.

```ts
// decorators/receive.decorator.ts
export interface ReceiveOptions {
  event: string;            // 프레임 type 값 (예: 'chat.message')
  payload: Type<unknown>;   // class-validator 데코레이터 달린 DTO 클래스
  summary?: string;
  description?: string;
  reply?: Type<unknown>;    // 이 이벤트에 대한 즉시 응답 프레임 DTO (optional)
  auth?: boolean;
}

export const Receive = (opts: ReceiveOptions): MethodDecorator => (
  target, propertyKey, descriptor
) => {
  const existing: WsEventMeta[] =
    Reflect.getMetadata(META.WS_EVENTS, target.constructor) ?? [];
  existing.push({ direction: 'recv', handler: propertyKey as string, ...opts });
  Reflect.defineMetadata(META.WS_EVENTS, existing, target.constructor);
  return descriptor;
};
```

`@Send`는 동일 패턴, `direction: 'send'`. 클래스 데코레이터로 쓸 수 있게 오버로드도 제공(이벤트 목록만 선언하고 싶을 때):

```ts
@Send({ event: 'presence.update', payload: PresenceDto })  // class-level 도 허용
@WebSocketGateway({ path: '/realtime' })
export class RealtimeGateway { ... }
```

### 2.3 메타데이터 스캐너

`onApplicationBootstrap`에서 한 번 실행:

```ts
// scanner/ws.scanner.ts
@Injectable()
export class WsScanner {
  constructor(private discovery: DiscoveryService, private metadataScanner: MetadataScanner) {}

  scan(): WsChannel[] {
    const channels: WsChannel[] = [];
    const providers = this.discovery.getProviders();
    for (const wrapper of providers) {
      const { instance, metatype } = wrapper;
      if (!metatype) continue;
      const gatewayMeta = Reflect.getMetadata(GATEWAY_METADATA, metatype);
      if (!gatewayMeta) continue;

      const events = [
        ...(Reflect.getMetadata(META.WS_EVENTS, metatype) ?? []),
        ...this.collectMethodLevel(instance, metatype),
      ];
      channels.push({
        name: metatype.name,
        url: gatewayMeta.path ?? '/',
        namespace: gatewayMeta.namespace,
        events,
      });
    }
    return channels;
  }
}
```

### 2.4 Spec 생성

```ts
// generator/openapi.ts
export function buildDocument(app: INestApplication, options: PuppleDocOptions): OpenAPIObject {
  // 1. REST: @nestjs/swagger에 위임
  const base = SwaggerModule.createDocument(app, options.openapi);

  // 2. WS: 스캐너로 수집 → x-websocket 확장
  const scanner = app.get(WsScanner);
  const channels = scanner.scan();

  return {
    ...base,
    'x-websocket': {
      channels: channels.map(ch => ({
        name: ch.name,
        url: ch.url,
        events: ch.events.map(e => ({
          direction: e.direction,           // 'recv' | 'send'
          event: e.event,
          summary: e.summary,
          description: e.description,
          payload: refOrInline(e.payload, base),
          reply: e.reply ? refOrInline(e.reply, base) : undefined,
          auth: e.auth ?? true,
        })),
      })),
    },
  } as OpenAPIObject;
}
```

**DTO → JSON Schema**: 이미 `@nestjs/swagger`가 `class-transformer`/`class-validator` 메타로 스키마를 만드는 로직을 갖고 있다. 우리는 그 내부 `SchemaObjectFactory`를 재사용해 `components.schemas`에 등록하고 `$ref`로 링크한다. (Nest swagger의 `SchemaObjectFactory`를 직접 import하거나, 데코레이트만 된 DTO를 fake REST endpoint로 등록해 추출하는 우회 방법도 있다 — 전자 추천.)

### 2.5 모듈 / setup

```ts
// module/puppledoc.module.ts
export class PuppleDocModule {
  static setup(path: string, app: INestApplication, options: PuppleDocOptions): void {
    const document = buildDocument(app, options);

    const httpAdapter = app.getHttpAdapter();
    // JSON spec
    httpAdapter.get(`/${path}/openapi.json`, (_, res) => res.json(document));
    // UI (static from @puppledoc/space-ui/dist)
    serveUi(httpAdapter, path);
  }
}

export interface PuppleDocOptions {
  openapi: Omit<OpenAPIObject, 'paths'>;  // DocumentBuilder().build() 결과
  ui?: {
    title?: string;
    theme?: 'light' | 'dark' | 'auto';
    servers?: { label: string; url: string }[];
  };
}
```

**사용자 시점**:
```ts
// main.ts
const config = new DocumentBuilder()
  .setTitle('Space API')
  .setVersion('1.0.0')
  .addBearerAuth()
  .build();

PuppleDocModule.setup('docs', app, {
  openapi: config,
  ui: { servers: [{ label: 'Local', url: 'http://localhost:3000' }] },
});
```

### 2.6 UI 서빙 어댑터

express와 fastify 둘 다 지원 — `httpAdapter.getType()`으로 분기.

```ts
// server/ui-adapter.ts
export function serveUi(httpAdapter: HttpAdapterHost['httpAdapter'], basePath: string) {
  const uiDir = require.resolve('@puppledoc/space-ui/dist/index.html').replace('/index.html', '');
  if (httpAdapter.getType() === 'express') {
    const express = require('express');
    httpAdapter.use(`/${basePath}`, express.static(uiDir, { index: 'index.html' }));
  } else {
    // fastify: @fastify/static 사용
  }
}
```

UI는 부팅 시 `/{basePath}/openapi.json`을 fetch해서 렌더.

---

## 3. UI 패키지 (`@puppledoc/space-ui`)

React + Vite로 빌드하여 `dist/` 정적 산출물을 core가 번들 포함해 배포. 디자인 토큰/레이아웃은 `./DESIGN.md` 참조.

### 3.1 레이아웃 (3-column grid)

```
┌─────────┬────────────────────┬──────────────┐
│ Sidebar │ Docs (scroll)      │ Test panel   │
│ 280px   │ 1fr                │ 440px        │
│         │                    │ (dark theme) │
└─────────┴────────────────────┴──────────────┘
```

CSS grid 단일 컨테이너, 디자인 토큰은 `tokens.css`에 `:root` 변수로(`DESIGN.md` §2).

### 3.2 상태 (Zustand)

```ts
interface UiState {
  doc: OpenAPIObject | null;          // 부팅 시 fetch
  activeId: string | null;            // ':' 구분 id 예: 'rest:GET /users' / 'ws:ChatGateway:message'
  token: string;                      // Bearer
  server: string;                     // 선택된 baseURL
  density: 'comfortable' | 'compact';
  paletteOpen: boolean;
}
```

localStorage 키: `space-api:token`, `space-api:activeId`. 토큰 저장은 **옵트인**(Authorize 모달에서 "remember" 체크).

### 3.3 메서드 pill 색상

REST 6개 + WSS 3변형(WSS, WSS↑, WSS↓). `data-method` 속성으로 CSS 변수 스위치. `DESIGN.md` §3 참조.

### 3.4 REST 테스트 러너

```ts
// runners/rest.ts
export async function runRest(req: {
  method: string; url: string; headers: Record<string,string>;
  body?: unknown;
}): Promise<{ status: number; body: unknown; durationMs: number; size: number }> {
  const start = performance.now();
  const res = await fetch(req.url, {
    method: req.method,
    headers: { 'Content-Type': 'application/json', ...req.headers },
    body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
  });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch {}
  return {
    status: res.status,
    body,
    durationMs: Math.round(performance.now() - start),
    size: new Blob([text]).size,
  };
}
```

CORS는 유저 앱 책임. 문서에 "docs 경로에서 오는 요청을 CORS 허용하라" 명시.

### 3.5 WS 테스트 러너

```ts
// runners/ws.ts
export function openWs(url: string, opts: { token?: string }) {
  const u = new URL(url);
  if (opts.token) u.searchParams.set('token', opts.token);
  const ws = new WebSocket(u.toString());
  const frames: Frame[] = [];
  ws.addEventListener('message', (e) => {
    frames.push({ dir: 'recv', at: Date.now(), raw: e.data, parsed: safeJson(e.data) });
  });
  return {
    send: (obj: unknown) => {
      const raw = JSON.stringify(obj);
      ws.send(raw);
      frames.push({ dir: 'send', at: Date.now(), raw, parsed: obj });
    },
    close: () => ws.close(),
    onFrame: (cb: (f: Frame) => void) => { /* observer */ },
  };
}
```

**단일 이벤트 페이지(`@Receive`/`@Send` 하나 클릭 시)**:
- 상단에 `type: "event.name"` 표시
- 기본 payload 편집기(JSON textarea, DTO 예시로 프리필)
- Send: 소켓이 닫혀있으면 자동 connect 후 전송
- Receive-only 이벤트: "Expect" 모드 — 소켓 열고 해당 event type만 필터해서 표시

### 3.6 코드 스위처

`curl` / `fetch` / `axios` / `websocket(js)` 4종. `codegen/` 아래 pure function:

```ts
// codegen/curl.ts
export const genCurl = (r: RestRequest): string => [
  `curl -X ${r.method} '${r.url}'`,
  ...Object.entries(r.headers).map(([k,v]) => `  -H '${k}: ${v}'`),
  r.body !== undefined ? `  -d '${JSON.stringify(r.body)}'` : null,
].filter(Boolean).join(' \\\n');
```

### 3.7 Command palette

`⌘K` / `Ctrl+K` — 전체 endpoint flat list를 fuzzy search. 간단한 구현: `match(query, label)` 점수 계산. 외부 lib 금지(의존성 줄이기).

### 3.8 Export

- **OpenAPI**: 현재 doc json 그대로 다운로드.
- **MCP**: 간단 변환기. REST endpoint는 MCP tool, WS 이벤트는 notification으로 매핑. v0.2로 미룸.

---

## 4. 빌드 & 배포

### 4.1 core (`@puppledoc/nestjs-api-reference`)

- `tsup`으로 ESM+CJS+d.ts 동시 출력.
- `package.json`:
  ```json
  {
    "name": "@puppledoc/nestjs-api-reference",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "files": ["dist"],
    "peerDependencies": {
      "@nestjs/common": "^10 || ^11",
      "@nestjs/core": "^10 || ^11",
      "@nestjs/swagger": "^7 || ^8",
      "@nestjs/websockets": "^10 || ^11",
      "reflect-metadata": "^0.2"
    },
    "dependencies": {
      "@puppledoc/space-ui": "workspace:*"
    }
  }
  ```
- `@puppledoc/space-ui`는 **dependency**로 들고, publish 시점에 `workspace:*` → 실제 버전으로 치환(pnpm이 자동 처리).

### 4.2 ui (`@puppledoc/space-ui`)

- Vite의 library 모드가 아니라 **SPA 빌드** → `dist/index.html` + `dist/assets/*`.
- `package.json`의 `files: ["dist"]`, `exports` 필드는 `./dist/*` 노출.
- 부팅 시 `/${basePath}/openapi.json`을 fetch — 경로는 UI가 자기 `window.location`에서 역산.

### 4.3 릴리즈

- Changesets로 버전 관리 (`@changesets/cli`).
- CI: lint → typecheck → build → test → `changeset publish`.
- core와 ui는 **항상 함께 bump**(lockstep) — API가 물려있으므로.

---

## 5. 개발 워크플로우

```bash
pnpm install
pnpm -r build                         # 전체 빌드
pnpm --filter @puppledoc/space-ui dev       # UI 개발 (Vite dev + 목 OpenAPI)
pnpm --filter playground start:dev    # NestJS 샘플 (실제 WS/REST 동작)
```

Playground 앱은:
- `ChatGateway`에 `@Receive`/`@Send` 3~4개씩
- `WorkspacesController`에 CRUD
- `main.ts`에서 `PuppleDocModule.setup('docs', app, ...)` 호출
- `pnpm start:dev` 후 `http://localhost:3000/docs` 접속 시 UI 뜨는지 확인

UI는 개발 시 `VITE_MOCK_SPEC=1`이면 `public/mock-openapi.json`을 쓰고, 아니면 `/docs/openapi.json` fetch.

---

## 6. 구현 순서 (v0.1 MVP)

1. **모노레포 스캐폴드** — pnpm workspace, turbo, tsconfig.base, ESLint.
2. **Core 데코레이터 + 스캐너 + 빈 모듈** — `PuppleDocModule.setup()`이 `openapi.json`을 200으로 내려주는 데까지.
3. **DTO → schema 변환** — `@nestjs/swagger` internal 재사용.
4. **UI 스캐폴드** — Vite + React + 토큰 CSS, 레이아웃 shell (사이드바/docs/test-panel 빈 박스).
5. **Endpoint 네비 + 상세 렌더** (REST only).
6. **REST 테스트 러너** (fetch, Response preview, code switcher).
7. **WS 스캐너/spec → WS 상세 + 이벤트 단위 페이지**.
8. **WS 실제 테스트 러너** (connect / send / recv 로그).
9. **Command palette, Authorize 모달**.
10. **UI를 core에 dist로 번들 → playground에서 최종 검증**.
11. **README, CHANGELOG, 첫 publish (0.1.0)**.

각 단계 끝에서 playground로 회귀 확인. 타입체크/린트는 각 PR blocking.

---

## 7. 열린 질문 (구현 전 확정 필요)

1. **소켓 라이브러리**: 첫 릴리즈는 native WS만. socket.io는 `adapter` 추상화로 나중에 확장 — OK?
2. **UI 테마 전환**: 라이트만(디자인 기준). 다크는 v0.3로.
3. **인증 스킴**: Bearer 단일 필드로 시작. API Key/Basic은 `ui.authSchemes` 옵션으로 v0.2에.
4. **번들 크기 목표**: UI gzipped **< 250KB**. Monaco 대신 가벼운 textarea + 수동 하이라이트로 충분(mockup 수준).
5. **Fastify 우선순위**: express만 먼저. Fastify는 커뮤니티 PR 여지.
