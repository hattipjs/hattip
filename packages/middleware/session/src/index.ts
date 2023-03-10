import { RequestContext } from "@hattip/compose";
import "@hattip/cookie";
import type { CookieSerializeOptions } from "@hattip/cookie";

declare module "@hattip/compose" {
	interface RequestContextExtensions {
		/** Session */
		session: Session;
	}
}

export interface Session {
	/**
	 * Session data. You can redefine its type like this:
	 *
	 * ```ts
	 * import "@hattip/session";
	 *
	 * declare module "@hattip/session" {
	 *   interface SessionData {
	 *     userId: string; // Example
	 *   }
	 * }
	 * ```
	 */
	data: SessionData;

	/** Is this a newly created session? */
	readonly isFresh: boolean;

	/** Regenerate the session ID */
	regenerate(): Promise<void>;

	/** Destroy the session */
	destroy(): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SessionData {}

export interface SessionOptions {
	/** Store that persists session data */
	store: SessionStore;
	/** Get session ID from the request. A cookie is used if not provided. */
	getSessionId?: (ctx: RequestContext) => string | undefined;
	/** Send a session ID to the client. A cookie is used if not provided. */
	setSessionId?: (
		ctx: RequestContext,
		response: Response,
		id: string | null,
		maxAge?: number,
	) => string | undefined;
	/** Default session data or a function that returns it */
	defaultSessionData:
		| SessionData
		| ((ctx: RequestContext) => Awaitable<SessionData>);
	/** Name of the session cookie. Ignored if `getSessionId` is provided */
	cookieName?: string;
	/** Hash function to detect session changes */
	hash?(data: SessionData): Awaitable<any>;
	/** Cookie serialization options */
	cookieOptions?: CookieSerializeOptions;
}

export type Awaitable<T> = T | Promise<T>;

export interface SessionStore {
	load(id: string, ctx: RequestContext): Awaitable<SessionData | null>;

	save(
		id: string | null,
		data: SessionData,
		maxAge: number,
		ctx: RequestContext,
	): Awaitable<string>;

	destroy(id: string, ctx: RequestContext): Awaitable<void>;
}

export function session(options: SessionOptions) {
	const {
		defaultSessionData,
		cookieName = "session",
		hash = JSON.stringify,
		cookieOptions,
		getSessionId = (ctx) => ctx.cookie[cookieName],
		setSessionId = (ctx, _response, id, maxAge) => {
			if (id === null) {
				ctx.deleteCookie(cookieName, cookieOptions);
			} else {
				ctx.setCookie(cookieName, id, { ...cookieOptions, maxAge });
			}
		},
	} = options;

	const maxAge =
		(cookieOptions?.maxAge ? cookieOptions.maxAge * 1000 : undefined) ??
		(cookieOptions?.expires
			? cookieOptions.expires.getTime() - Date.now()
			: 5 * 60 * 1000);

	return async (ctx: RequestContext) => {
		const sessionId = getSessionId(ctx);

		let data: SessionData | null = null;

		if (sessionId) {
			data = await options.store.load(sessionId, ctx);
		}

		const isFresh = !data;

		if (!data) {
			const defaultData: SessionData =
				typeof defaultSessionData === "function"
					? await defaultSessionData(ctx)
					: defaultSessionData;
			data = defaultData;
		}

		const oldHash = await hash(data);
		let shouldRegenerate = false;
		let shouldDestroy = false;

		ctx.session = {
			data,
			isFresh,

			async regenerate() {
				shouldRegenerate = true;
			},

			async destroy() {
				shouldDestroy = true;
			},
		};

		const response = await ctx.next();

		if (shouldDestroy) {
			if (sessionId) {
				await options.store.destroy(sessionId, ctx);
				setSessionId(ctx, response, null, maxAge);
			}

			return response;
		}

		if (
			isFresh &&
			(typeof defaultSessionData === "function" ||
				oldHash !== (await hash(ctx.session.data)))
		) {
			const newId = await options.store.save(
				shouldRegenerate ? null : sessionId ?? null,
				ctx.session.data,
				maxAge,
				ctx,
			);
			setSessionId(ctx, response, newId, maxAge);
		}

		return response;
	};
}

export interface SessionSerializationOptions {
	stringify?: (data: SessionData) => string;
	parse?: (data: string) => SessionData;
}

export { UnsafeMemorySessionStore } from "./unsafe-memory-store";
export { SimpleCookieStore } from "./simple-cookie-store";
export { SignedCookieStore } from "./signed-cookie-store";
export { EncryptedCookieStore } from "./encrypted-cookie-store";
export { RedisSessionStore } from "./redis-store";
export { KvSessionStore } from "./kv-store";
