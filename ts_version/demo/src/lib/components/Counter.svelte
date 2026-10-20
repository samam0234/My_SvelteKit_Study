<script lang="ts">
	let count = $state(0);
</script>

<p class="text-sm font-semibold text-ember">study8 · $state</p>
<p class="mt-2 text-4xl font-semibold tabular-nums">{count}</p>
<button
	type="button"
	class="mt-3 bg-ink px-4 py-2 text-sm font-semibold text-paper"
	onclick={() => count++}
>
	하나 더
</button>
<p class="mt-2 text-xs text-stone-600">
	처음 HTML의 숫자는 0입니다. 버튼을 눌러도 서버로 요청이 나가지 않습니다.
</p>
