import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { handler } from './build/handler.js';
const origin = process.env.ORIGIN || 'http://localhost:3000';
const server = createServer(handler),
	sockets = new WebSocketServer({ noServer: true, maxPayload: 1024 });
server.on('upgrade', (request, socket, head) => {
	if (request.url !== '/ws' || request.headers.origin !== origin) {
		socket.destroy();
		return;
	}
	sockets.handleUpgrade(request, socket, head, (ws) => {
		ws.on('error', console.error);
		ws.on('message', (data) => {
			if (data.toString() === 'ping')
				ws.send(JSON.stringify({ type: 'pong', at: new Date().toISOString() }));
		});
	});
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0');
for (const signal of ['SIGINT', 'SIGTERM'])
	process.on(signal, () => {
		for (const ws of sockets.clients) ws.close();
		server.close(() => process.exit(0));
	});
