export function createServeHandler(handler) {
	return (request, info) => {
		return handler({
			request,
			ip: info.remoteAddr.hostname,
			env(variable) {
				// eslint-disable-next-line no-undef
				return Deno.env.get(variable);
			},
			waitUntil() {
				// No op
			},
			passThrough() {
				// No op
			},
			platform: { name: "deno", info },
		});
	};
}
