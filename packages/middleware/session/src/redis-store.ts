import { RequestContext } from "@hattip/compose";
import {
	Awaitable,
	SessionData,
	SessionSerializationOptions,
	SessionStore,
} from ".";
import { randomUUID } from "./crypto";

export interface RedisClient {
	set(
		key: string,
		value: string,
		mode: string,
		duration: number,
		callback: (err: any, reply: any) => void,
	): void;

	get(key: string, callback: (err: any, reply: string | null) => void): void;

	del(key: string, callback: (err: any, reply: any) => void): void;
}

interface RedisSessionStoreOptions {
	getClient(ctx: RequestContext): Awaitable<RedisClient>;
	generateId?(): Awaitable<string>;
	validateId?(id: string): Awaitable<boolean>;
	serializationOptions?: SessionSerializationOptions;
}

export class RedisSessionStore implements SessionStore {
	readonly #getClient: (ctx: RequestContext) => Awaitable<RedisClient>;
	readonly #generateId: () => Awaitable<string>;
	readonly #validateId: (id: string) => Awaitable<boolean>;
	readonly #stringify: (data: SessionData) => string;
	readonly #parse: (data: string) => SessionData;

	constructor(options: RedisSessionStoreOptions) {
		const {
			getClient,
			generateId = async () => "session:" + (await randomUUID()),
			validateId = (id) => id.startsWith("session:"),
			serializationOptions = {},
		} = options;

		this.#getClient = getClient;
		this.#generateId = generateId;
		this.#validateId = validateId;

		const { stringify = JSON.stringify, parse = JSON.parse } =
			serializationOptions;
		this.#stringify = stringify;
		this.#parse = parse;
	}

	async load(id: string | null, ctx: RequestContext) {
		if (!id || !(await this.#validateId(id))) {
			return null;
		}

		const client = await this.#getClient(ctx);

		const value = await new Promise<string | null>((resolve, reject) => {
			client.get(id, (err, reply) => {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});

		return value && this.#parse(value);
	}

	async save(
		id: string | null,
		data: SessionData,
		maxAge: number,
		ctx: RequestContext,
	) {
		if (!id || !(await this.#validateId(id))) {
			id = await this.#generateId();
		}

		const client = await this.#getClient(ctx);

		await new Promise((resolve, reject) => {
			client.set(
				id!,
				this.#stringify(data),
				"EX",
				maxAge / 1000,
				(err, reply) => {
					if (err) {
						reject(err);
					} else {
						resolve(reply);
					}
				},
			);
		});

		return id;
	}

	async destroy(id: string, ctx: RequestContext) {
		const client = await this.#getClient(ctx);

		await new Promise((resolve, reject) => {
			client.del(id, (err, reply) => {
				if (err) {
					reject(err);
				} else {
					resolve(reply);
				}
			});
		});
	}
}
