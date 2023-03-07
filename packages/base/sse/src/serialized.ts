export type JsonSerialized<T> = T extends string
	? T
	: T extends number
	? T
	: T extends boolean
	? T
	: T extends null
	? T
	: T extends undefined
	? T
	: T extends Date
	? string
	: T extends []
	? []
	: T extends [infer U]
	? [JsonSerialized<U>]
	: T extends [infer U, ...infer V]
	? [JsonSerialized<U>, ...JsonSerialized<V>]
	: T extends Array<infer U>
	? Array<JsonSerialized<U>>
	: T extends object
	? { [K in keyof T]: K extends string ? JsonSerialized<T[K]> : never }
	: never;

const sym: unique symbol = Symbol("sym");

interface X {
	a: string;
	d: Date;
	[sym]: number;
}

export type Y = JsonSerialized<X>;
