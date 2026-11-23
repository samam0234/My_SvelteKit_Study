<script>
import { resolve } from '$app/paths';
import { onMount } from 'svelte';
let time = $state('연결 중'), socketStatus = $state('연결 중');
onMount(() => {
    const events = new EventSource('/api/events');
    events.onmessage = (event) => (time = JSON.parse(event.data).time);
    const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    socket.onopen = () => {
        socketStatus = '연결됨';
        socket.send('ping');
    };
    socket.onmessage = (event) => (socketStatus = event.data);
    socket.onerror = () => (socketStatus = '운영 서버: npm start로 WebSocket을 실행하세요.');
    return () => {
        events.close();
        socket.close();
    };
});
</script>

<h1>실시간 연결</h1>
<p>SSE 알림: {time}</p>
<p>WebSocket: {socketStatus}</p>
<a href={resolve('/board')}>게시판</a>
