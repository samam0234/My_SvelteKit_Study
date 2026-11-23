# study16 — 운영·CI/CD

## ① 목표 한 줄

Docker·자동 검증·배포·로그·백업을 점검표로 운영한다.

이 문서는 SvelteKit 하나만 다룬다. 실행 코드: `ts_version/project`·`js_version/project`, 기초 SSR 기존 예제는 `*/demo`다. TypeScript 전체 코드를 싣고 JavaScript는 같은 상대 위치의 `.js`·타입 없는 script로 제공한다. 프로젝트의 심화 기능은 뒤 단계를 위해 미리 존재하지만 해당 단계의 원리와 파일부터 순서대로 학습한다.

## ② 📖 이론

컨테이너 이미지는 실행 파일·의존성을 묶고 환경변수와 DB volume은 실행 시 주입한다. 멀티 스테이지 빌드는 빌드 도구와 운영 실행물을 나누고 운영 이미지는 node 사용자로 실행한다. 배포는 물건 배송, health check는 도착 확인, backup과 restore는 분실 복구 훈련에 비유할 수 있다.

CI는 push·PR에서 JS·TS demo/project의 설치·검사·테스트·빌드를 수행한다. CD는 workflow_dispatch로 고정 SHA 이미지 생성→GHCR→인증된 배포 webhook→/health 확인을 수행한다. 실제 호스트는 DEPLOY_HOOK·DEPLOY_TOKEN·HEALTH_URL을 구성해야 한다. 파일이 존재하는 것과 GitHub에서 실행되어 배포된 것은 다르다.

운영 로그는 requestId·method·path·status·ms만 기본 기록하고 token·password·문서 본문은 제외한다. health는 DB 읽기까지 검사한다. 백업은 pg_dump custom format으로 만들고 docker cp로 꺼내 PowerShell 이진 리다이렉션 손상을 피한다. 백업 성공은 복구 성공을 보장하지 않아 별도 DB 복원이 필요하다.

## ③ 🛠️ 실기 — 전체 코드와 줄별 설명

운영 순서는 아래 배포·백업 체크리스트를 따른다. 로컬 compose 예시는 PostgreSQL을 기본으로 실행한다.

1. root `.env.example`를 `.env`로 복사하고 DB_PASSWORD·JWT_SECRET을 바꾼다.
2. `docker compose config`, `docker compose up --build -d` 후 health를 확인한다.
3. 로그를 보고 API 테스트를 외부 노출 주소가 아닌 테스트 환경에 실행한다.
4. `scripts/backup.ps1`로 dump를 만들고 별도 DB에 pg_restore한다.
5. 외부 호스트의 HTTPS·영속 volume·비밀·배포 훅을 준비한 뒤 CD를 수동 실행하고 이전 SHA 이미지로 원복한다.

실행: 앱 루트에서 `npm ci` 후 `npm run dev`, 배포 산출물은 `npm run build` 후 `npm start`다. 환경 설정은 [study0](study0.md), 실행 결과와 범위는 [검증 기록](docs/verification.md)을 참고한다. 코드 블록은 실제 파일 원문이며 import된 의존 파일은 저장소에 함께 있다.

### 운영·배포·복구 점검

- [ ] `.env`·키·DB 덤프가 Git에 들어가지 않는지 확인
- [ ] lockfile 설치, 단위·API 검사, 빌드 통과
- [ ] 이미지 비root 실행, 영속 DB·업로드 volume, DB 비공개 접근
- [ ] ORIGIN·PUBLIC_ORIGIN·CORS_ORIGIN·OAuth callback을 실제 HTTPS 주소와 일치
- [ ] `/health` DB 연결, 가입·로그인·CRUD·로그아웃 재검사
- [ ] 로그 requestId·status·지연 수집, 5xx·DB 장애·디스크 경고 알림
- [ ] 백업 retention·암호화·외부 보관, 업로드도 별도 백업
- [ ] 별도 DB에서 `pg_restore` 후 데이터 개수·관계 검증
- [ ] 이전 이미지 SHA·설정으로 rollback 훈련
- [ ] 외부 배포 URL·실행한 Actions run을 기록하고 미실행은 체크하지 않기

```powershell
# root .env 설정 후
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs --tail 50 web
./scripts/backup.ps1
# 복구는 운영 DB가 아닌 별도 restore_test DB에 한다.
docker compose exec -T db createdb -U pine restore_test
docker compose exec -T db pg_restore -U pine -d restore_test /tmp/pine.dump
```

config는 변수·구문 검사, up은 이미지 빌드와 기동, ps는 health, logs는 최근 출력, backup은 custom dump 생성이다. 마지막 두 줄은 복원 연습이며 성공 후 `/tmp/pine.dump` 파일과 생성 DB를 별도로 관리한다. 운영 복원에는 유지보수·원복 계획을 먼저 세운다.


### `Dockerfile` 전체 코드

[실제 파일](ts_version/project/Dockerfile) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/server.mjs ./
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 2 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 3 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 4 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 5 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 6 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 7 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 8 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 9 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 10 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 11 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 12 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 13 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 14 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 15 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |
| 16 | 실패를 처리한다. 내부 예외·비밀을 응답에 그대로 노출하지 않는다. |
| 17 | 컨테이너 빌드 또는 실행 환경을 정의한다. 단계 순서와 실행 사용자를 확인한다. |

### `../../.github/workflows/ci.yml` 전체 코드

[실제 파일](ts_version/project/../../.github/workflows/ci.yml) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```yaml
name: course-ci
on: [push, pull_request]
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [js_version/demo, ts_version/demo, js_version/project, ts_version/project]
    defaults:
      run:
        working-directory: ${{ matrix.app }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: ${{ matrix.app }}/package-lock.json
      - run: npm ci
      - run: npm run check --if-present
      - run: npm test --if-present
      - run: npm run build
      - if: contains(matrix.app, 'project')
        run: |
          ORIGIN=http://127.0.0.1:3000 PORT=3000 AI_MODE=mock npm start > /tmp/pine.log 2>&1 &
          for i in $(seq 1 30); do curl -fsS http://127.0.0.1:3000/health && break; sleep 1; done
          BASE_URL=http://127.0.0.1:3000 npm run test:api
          npx playwright install --with-deps chromium
          BASE_URL=http://127.0.0.1:3000 npm run test:browser
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 2 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 3 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 4 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 5 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 6 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 9 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 12 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 13 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 14 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 15 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 25 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 26 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 27 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 28 | 모음 또는 스트림의 항목을 순서대로 처리한다. |
| 29 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 30 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 31 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |

### `../../.github/workflows/deploy.yml` 전체 코드

[실제 파일](ts_version/project/../../.github/workflows/deploy.yml) · 줄 번호는 아래 코드 첫 줄부터 센다. 빈 줄과 닫는 괄호도 포함한다.

```yaml
name: publish-and-deploy
on:
  workflow_dispatch:
permissions:
  contents: read
  packages: write
concurrency: { group: pine-production, cancel-in-progress: false }
jobs:
  release:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npm ci && npm run check && npm test && npm run build
        working-directory: ts_version/project
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: ts_version/project
          push: true
          tags: ghcr.io/${{ github.repository_owner }}/pine-board:${{ github.sha }}
      - name: Deploy immutable image
        env:
          DEPLOY_HOOK: ${{ secrets.DEPLOY_HOOK }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          HEALTH_URL: ${{ vars.HEALTH_URL }}
        run: |
          test -n "$DEPLOY_HOOK" && test -n "$DEPLOY_TOKEN" && test -n "$HEALTH_URL"
          curl --fail --silent --show-error --request POST "$DEPLOY_HOOK" -H "Authorization: Bearer $DEPLOY_TOKEN" -H 'Content-Type: application/json' --data '{"image":"ghcr.io/${{ github.repository_owner }}/pine-board:${{ github.sha }}"}'
          sleep 10
          curl --fail --retry 5 --retry-delay 5 "$HEALTH_URL/health"
```

**줄별 설명**

| 줄 | 설명 |
|---|---|
| 1 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 2 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 3 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 4 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 5 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 6 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 7 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 8 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 9 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 10 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 11 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 12 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 13 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 14 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 15 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 16 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 17 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 18 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 19 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 20 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 21 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 22 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 23 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 24 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 25 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 26 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 27 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 28 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 29 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 30 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 31 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 32 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 33 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 34 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 35 | 객체·설정·모델의 필드를 지정한다. 이름은 호출자와의 계약이다. |
| 36 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |
| 37 | 현재 블록의 계산·호출을 수행한다. 위에서 선언한 입력을 아래 결과로 이어 준다. |

## ④ 🔗 연동 포인트

단일 서비스 운영이 확인된 뒤에만 실시간 연결·worker를 여러 인스턴스로 확장한다. 다음 단계는 HTTP와 다른 수명의 연결이다.

## ⑤ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 이미지는 healthy인데 로그인 실패 | 외부 ORIGIN·HTTPS·DB 설정 불일치 | 배포 후 실제 사용자 흐름 점검 |
| 백업 파일은 있으나 복원 불가 | 이진 출력 리다이렉션 손상 또는 복구 미검증 | 컨테이너 파일 복사·별도 DB restore |

## ⑥ 직접 해보기

1. 별도 restore_test DB에 백업을 복원하고 글 수를 비교하자.
2. CI에 실패하는 입력을 넣어 빌드가 중단되는지 확인하자.
3. 운영 비밀을 바꾸는 절차와 원복 SHA를 기록하자.

## ⑦ ☐ 체크리스트

- [ ] Docker 비root·volume·health
- [ ] Actions 자동 검증·배포 구성
- [ ] 로그·모니터링·백업 복구
- [ ] 외부 배포와 구성 완료 구분

**📌 노션 원문 추가 항목** — 문구·괄호·원문 링크를 그대로 보존했다. 원래 다른 저장소 경로를 가리키는 항목도 바꾸지 않았다. 이 문서에서는 학습 확인용 빈 체크로 옮긴다. 현재 검증 여부는 README와 검증 기록을 따른다.

- [ ] adapter를 골라 배포 (→ study10, study17) — adapter-node 선택·Docker 이미지·로컬 컨테이너 확인까지 완료, <b>외부 배포는 아직</b>

## ⑧ 다음 단계 연결 문장

이 단계의 결과를 [study17](study17.md)에 연결한다. 다음 단계는 HTTP와 다른 수명의 연결이다.

공식 자료: [SvelteKit 문서](https://svelte.dev/docs/kit). 상세 출처는 [README](README.md)의 공식 자료와 노션 원문 링크를 따른다.
