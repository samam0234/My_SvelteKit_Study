export const load = async ({ fetch }) => ({
    spec: await (await fetch('/openapi.json')).json()
});
