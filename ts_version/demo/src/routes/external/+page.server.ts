import type { PageServerLoad } from './$types';

type RemotePost = { id: number; title: string };

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
	if (!res.ok) {
		return { posts: [] as RemotePost[], failed: true };
	}
	const posts = (await res.json()) as RemotePost[];
	return {
		posts: posts.map((post) => ({ id: post.id, title: post.title })),
		failed: false
	};
};
