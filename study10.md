# study10 — 고급 5: adapter-node

`adapter-auto`는 배포 환경을 추측합니다. 이 컴퓨터에서는 추측이 안 되어 안내만 출력하고 빌드는 끝났습니다. 이제는 `@sveltejs/adapter-node`로 고정합니다. `vite.config`의 `sveltekit({ adapter })`에 어댑터를 넣습니다. SvelteKit 3에는 `svelte.config.js`가 없습니다.

빌드 결과는 `build/`입니다. 실행은 `node build`입니다. `PORT`와 `HOST`를 읽습니다.

```
HOST=127.0.0.1 PORT=3010 node build
```

Docker 이미지는 `node:24-alpine`에서 `npm ci`, `npm run build`, `node build`를 합니다. 컨테이너 안에서는 `HOST=0.0.0.0`, `PORT=3000`입니다. `node_modules`, `.svelte-kit`, `build`, `data`, `.env`는 이미지 복사에서 뺍니다.

---

## 확인

양쪽 demo의 `npm run build`가 `Using @sveltejs/adapter-node`로 끝났습니다. 플랫폼을 못 찾겠다는 안내는 나오지 않았습니다.

`ts_version/demo`에서 `node build`를 3010 포트로 띄운 뒤 확인했습니다.

- `GET /` → 200, `<title>`에 `SvelteKit 실습`, 본문에 `study8`
- `GET /boom` → 418
- `GET /mark.svg` → 200

다음: [studyFinal.md](studyFinal.md) — 지금까지의 조각을 다른 구조의 작은 사이트로 조립합니다.
