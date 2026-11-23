export const GET = ({ request }) => {
    let timer;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            const send = () => controller.enqueue(encoder.encode('data: ' + JSON.stringify({ time: new Date().toISOString() }) + '\n\n'));
            send();
            timer = setInterval(send, 10000);
            request.signal.addEventListener('abort', () => {
                clearInterval(timer);
                try {
                    controller.close();
                }
                catch {
                    /* The browser may have already cancelled the stream. */
                }
            }, { once: true });
        },
        cancel() {
            clearInterval(timer);
        }
    });
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    });
};
