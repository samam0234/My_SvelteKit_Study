<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="mb-6 border-b border-line pb-3">
	<p class="text-sm font-semibold text-ember">중첩 레이아웃</p>
	<p class="text-sm text-stone-600">이 줄은 <code>/posts</code>로 시작하는 화면에서만 보입니다.</p>
</div>
{@render children()}
