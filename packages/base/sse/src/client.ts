export interface ClientOptions<M> {
	url: string | URL;
	withCredentials?: boolean;
	onMessage(message: M): void;
}

export async function createClient<M = unknown>(options: ClientOptions<M>) {
	const { url, withCredentials, onMessage } = options;
	const source = new EventSource(url, { withCredentials });
	let clientId: string | undefined;
	source.addEventListener("connected", (event) => {
		clientId = event.data;
	});

	if (onMessage) {
		source.addEventListener("message", (e) => {
			onMessage(JSON.parse(e.data));
		});
	}

	async function doFetch(body: unknown) {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-SSE-Client-ID": clientId!,
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			try {
				const body = await response.json();
				if (body.error) {
					throw new Error(body.error);
				}
			} catch {
				throw new Error(await response.text());
			}
		}

		return response.json();
	}

	await Promise.race([
		new Promise<void>((resolve) => {
			source.addEventListener("connected", () => resolve(), { once: true });
		}),
		new Promise((_, reject) => setTimeout(reject, 5000)),
	]);

	return {
		async subscribe(...channel: string[]): Promise<string[]> {
			return doFetch({ subscribe: channel });
		},

		async unsubscribe(...channel: string[]): Promise<string[]> {
			return doFetch({ unsubscribe: channel });
		},

		close() {
			source.close();
		},
	};
}
