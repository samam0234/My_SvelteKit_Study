<script>
import { asset } from '$app/paths';
let { data } = $props();
</script>

<h1>공통 API 스펙 v1</h1>
<a href={asset('openapi.json')}>OpenAPI 3 JSON 내려받기</a>
<p>
	JSON은 Swagger Editor에 가져올 수 있습니다. 인증은 course_session 쿠키 또는 Bearer 토큰입니다.
	오류는 error.code/message/fields/requestId입니다.
</p>
{#each Object.entries(data.spec.paths) as [path, methods] (path)}<h2>{path}</h2>
	<pre>{JSON.stringify(methods, null, 2)}</pre>{/each}
