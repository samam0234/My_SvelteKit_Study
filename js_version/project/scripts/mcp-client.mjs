import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
	StdioClientTransport,
	getDefaultEnvironment
} from '@modelcontextprotocol/sdk/client/stdio.js';
const client = new Client({ name: 'pine-client', version: '1.0.0' });
const transport = new StdioClientTransport({
	command: process.execPath,
	args: ['scripts/mcp-server.mjs'],
	env: {
		...getDefaultEnvironment(),
		BOARD_ORIGIN: process.env.BOARD_ORIGIN || 'http://127.0.0.1:5173'
	}
});
try {
	await client.connect(transport);
	console.log(JSON.stringify(await client.listTools()));
	const result = await client.callTool({
		name: 'search_posts',
		arguments: { q: process.argv[2] || '' }
	});
	console.log(JSON.stringify(result));
	if (result.isError) process.exitCode = 1;
} finally {
	await client.close();
}
