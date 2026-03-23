export interface ReadonlyUrl {
	readonly href: string; // "http://username:password@hostname:3000/path?query" = protocol + "//" + hostname
	readonly origin: string; // "http://hostname:3000" = protocol + "//" + hostname
	readonly host: string; // "hostname:3000" = hostname + (":" + port)
	readonly protocol: string; // "http:"
	readonly hostname: string; // "hostname"
	readonly port: string; // "3000"
	readonly pathname: string; // "/path"
	readonly search: string; // "?query"
	readonly searchParams: ReadonlySearchParams;

	toJSON(): string;
	toString(): string;
}

export interface ReadonlySearchParams {
	readonly size: number;

	get(name: string): string | null;
	getAll(name: string): string[];
	has(name: string, value?: string): boolean;

	toString(): string;

	[Symbol.iterator](): IterableIterator<[string, string]>;
	entries(): IterableIterator<[string, string]>;
	keys(): IterableIterator<string>;
	values(): IterableIterator<string>;
	forEach(
		callback: (
			value: string,
			key: string,
			parent: ReadonlySearchParams,
		) => void,
		thisArg?: unknown,
	): void;
}

class FastUrl implements ReadonlyUrl {
	#protocol: string;
	#hostname: string;
	#port: string;
	#pathname: string;
	#search: string;
	#searchParams: ReadonlySearchParams | null = null;

	constructor(
		protocol: string,
		hostname: string,
		port: string,
		pathname: string,
		search: string,
	) {
		this.#protocol = protocol;
		this.#hostname = hostname;
		this.#port = port;
		this.#pathname = pathname;
		this.#search = search;
	}

	get href(): string {
		return this.origin + this.#pathname + this.#search;
	}

	get origin(): string {
		return this.#protocol + "//" + this.host;
	}

	get host(): string {
		return this.#hostname + (this.#port ? ":" + this.#port : "");
	}

	get protocol(): string {
		return this.#protocol;
	}

	get hostname(): string {
		return this.#hostname;
	}

	get port(): string {
		return this.#port;
	}

	get pathname(): string {
		return this.#pathname;
	}

	get search(): string {
		return this.#search === "?" ? "" : this.#search;
	}

	get searchParams(): ReadonlySearchParams {
		if (this.#searchParams === null) {
			this.#searchParams = new URLSearchParams(this.#search);
		}

		return this.#searchParams;
	}

	toJSON(): string {
		return this.href;
	}

	toString(): string {
		return this.href;
	}
}

const PARSE_RE =
	/^((https?):)?(\/\/([a-z0-9-.]+))(?::(\d*))?((?:\/(?!(?:\.|%2[eE]){1,2}(?:[/?#]|$))(?:[A-Za-z0-9\-._~!$&'()*+,;=:@%\[\]]|%[0-9A-Fa-f]{2})*)+)?(\?(?:[A-Za-z0-9\-._~!$&()*+,;=:@/?%\[\]\\^`{|}]|%[0-9A-Fa-f]{2})*)?(#.*)?$/i;

const ENDS_WITH_NUMBER_RE = /(?:^|\.)[0-9][^.]*\.?$/;

const IPV4_RE = /^(((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4})\.?$/;

export function parseUrl(href: string): ReadonlyUrl {
	const match = PARSE_RE.exec(href);
	if (!match) {
		return new URL(href);
	}

	const [
		,
		unnormalized,
		,
		,
		unnormalizedHostname,
		unnormalizedPort,
		pathname,
		search = "",
	] = match;

	// If hostname ends with a segment that starts with a digit possibly followed by a dot
	let hostname: string;
	if (ENDS_WITH_NUMBER_RE.test(unnormalizedHostname!)) {
		const ipv4Match = IPV4_RE.exec(unnormalizedHostname!);
		if (!ipv4Match) {
			return new URL(href);
		} else {
			const ipv4 = ipv4Match[1]!;
			hostname = ipv4;
		}
	} else {
		hostname = unnormalizedHostname!.toLowerCase();
	}

	const protocol = unnormalized!.toLowerCase();

	let port: string;
	if (unnormalizedPort) {
		let numericPort = Number(unnormalizedPort);
		if (numericPort > 65535) {
			throw new TypeError("Invalid port");
		}

		port = String(numericPort);
		if (DEFAULT_PORTS[protocol!] === port) {
			port = "";
		}
	} else {
		port = "";
	}

	const normalizedPathname = pathname || "/";

	return new FastUrl(protocol!, hostname, port, normalizedPathname, search);
}

// Dot segments (literal or percent-encoded: /./  /../  /%2e/  /%2E./  etc.)
export const DOT_SEGMENT_RE = /\/(\.|%2[eE]){1,2}(\/|$)/;

// Chars outside RFC 3986 pchar + "/", bare "%" not followed by two hex digits, or dot segments
export const UNSAFE_PATHNAME_RE =
	/[^A-Za-z0-9\-._~!$&'()*+,;=:@/%]|%(?![0-9A-Fa-f]{2})|\/(\.|%2[eE]){1,2}(\/|$)/;

// Chars outside RFC 3986 query component that new URL() would encode, plus ' and "
export const UNSAFE_SEARCH_RE =
	/[^A-Za-z0-9\-._~!$&()*+,;=:@/?%]|%(?![0-9A-Fa-f]{2})/;

const DEFAULT_PORTS: Record<string, string> = {
	"http:": "80",
	"https:": "443",
};
