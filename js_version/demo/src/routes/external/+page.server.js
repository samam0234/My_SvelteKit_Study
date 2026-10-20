export async function load({ fetch }) {
	const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
	if (!res.ok) return { posts: [], failed: true };
	const posts = await res.json();
	return {
		posts: posts.map((post) => ({ id: post.id, title: post.title })),
		failed: false
	};
}
