export type DOMHighResTimeStamp = number;

export type EndingType = "native" | "transparent";

export type BufferSource = ArrayBufferView | ArrayBuffer;

export type BlobPart = BufferSource | Blob | string;

export type ReadableStreamReaderMode = "byob";

export type ReadableStreamType = "bytes";

export type ReadableStreamController<T> =
	| ReadableStreamDefaultController<T>
	| ReadableByteStreamController;

export type ReadableStreamReader<T> =
	| ReadableStreamDefaultReader<T>
	| ReadableStreamBYOBReader;

export type FormDataEntryValue = File | string;

export type HeadersInit = [string, string][] | Record<string, string> | Headers;

export type XMLHttpRequestBodyInit =
	| Blob
	| BufferSource
	| FormData
	| URLSearchParams
	| string;

export type BodyInit = ReadableStream | XMLHttpRequestBodyInit;

export type RequestCache =
	| "default"
	| "force-cache"
	| "no-cache"
	| "no-store"
	| "only-if-cached"
	| "reload";

export type RequestCredentials = "include" | "omit" | "same-origin";

export type RequestDestination =
	| ""
	| "audio"
	| "audioworklet"
	| "document"
	| "embed"
	| "font"
	| "frame"
	| "iframe"
	| "image"
	| "manifest"
	| "object"
	| "paintworklet"
	| "report"
	| "script"
	| "sharedworker"
	| "style"
	| "track"
	| "video"
	| "worker"
	| "xslt";

export type RequestInfo = Request | string;

export type RequestMode = "cors" | "navigate" | "no-cors" | "same-origin";

export type RequestPriority = "auto" | "high" | "low";

export type RequestRedirect = "error" | "follow" | "manual";

export type ReferrerPolicy =
	| ""
	| "no-referrer"
	| "no-referrer-when-downgrade"
	| "origin"
	| "origin-when-cross-origin"
	| "same-origin"
	| "strict-origin"
	| "strict-origin-when-cross-origin"
	| "unsafe-url";

export type ResponseType =
	| "basic"
	| "cors"
	| "default"
	| "error"
	| "opaque"
	| "opaqueredirect";

export type EventListenerOrEventListenerObject = EventListener; // | EventListenerObject;

export interface EventInit {
	bubbles?: boolean;
	cancelable?: boolean;
	composed?: boolean;
}

export interface EventListenerOptions {
	capture?: boolean;
}

export interface AddEventListenerOptions extends EventListenerOptions {
	once?: boolean;
	passive?: boolean;
	signal?: AbortSignal;
}

export interface EventListener {
	(evt: Event): void;
}

// export interface EventListenerObject {
// 	handleEvent(object: Event): void;
// }

export interface Event {
	readonly bubbles: boolean;
	cancelBubble: boolean;
	readonly cancelable: boolean;
	readonly composed: boolean;
	readonly currentTarget: EventTarget | null;
	readonly defaultPrevented: boolean;
	readonly eventPhase: 0 | 2;
	readonly isTrusted: boolean;
	returnValue: boolean;
	readonly srcElement: EventTarget | null;
	readonly target: EventTarget | null;
	readonly timeStamp: DOMHighResTimeStamp;
	readonly type: string;
	composedPath(): [EventTarget?];
	initEvent(type: string, bubbles?: boolean, cancelable?: boolean): void;
	preventDefault(): void;
	stopImmediatePropagation(): void;
	stopPropagation(): void;
	// readonly NONE: 0;
	// readonly CAPTURING_PHASE: 1;
	// readonly AT_TARGET: 2;
	// readonly BUBBLING_PHASE: 3;
}

export interface EventTarget {
	addEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject, //  | null,
		options?: AddEventListenerOptions | boolean,
	): void;
	dispatchEvent(event: Event): boolean;
	removeEventListener(
		type: string,
		callback: EventListenerOrEventListenerObject, // | null,
		options?: EventListenerOptions | boolean,
	): void;
}

export interface AbortSignalEventMap {
	abort: Event;
}

export interface AbortSignal extends EventTarget {
	readonly aborted: boolean;
	onabort: ((ev: Event) => any) | null;
	readonly reason: any;
	throwIfAborted(): void;
	addEventListener<K extends keyof AbortSignalEventMap>(
		type: K,
		listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => any,
		options?: boolean | AddEventListenerOptions,
	): void;
	addEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void;
	removeEventListener<K extends keyof AbortSignalEventMap>(
		type: K,
		listener: (this: AbortSignal, ev: AbortSignalEventMap[K]) => any,
		options?: boolean | EventListenerOptions,
	): void;
	removeEventListener(
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | EventListenerOptions,
	): void;
}

export interface AbortController {
	readonly signal: AbortSignal;
	abort(reason?: any): void;
}

export interface QueuingStrategy<T = any> {
	highWaterMark?: number;
	size?: QueuingStrategySize<T>;
}

export interface QueuingStrategySize<T = any> {
	(chunk: T): number;
}

export interface QueuingStrategyInit {
	highWaterMark: number;
}

export interface StreamPipeOptions {
	preventAbort?: boolean;
	preventCancel?: boolean;
	preventClose?: boolean;
	signal?: AbortSignal;
}

export interface ReadableStreamGenericReader {
	readonly closed: Promise<void>;
	cancel(reason?: any): Promise<void>;
}

export interface ReadableStreamReadValueResult<T> {
	done: false;
	value: T;
}

export interface ReadableStreamReadDoneResult<T> {
	done: true;
	value?: T | undefined;
}

export type ReadableStreamReadResult<T> =
	| ReadableStreamReadValueResult<T>
	| ReadableStreamReadDoneResult<T>;

export interface ReadableStreamBYOBRequest {
	readonly view: ArrayBufferView<ArrayBuffer> | null;
	respond(bytesWritten: number): void;
	respondWithNewView(view: ArrayBufferView<ArrayBuffer>): void;
}

export interface ReadableByteStreamController {
	readonly byobRequest: ReadableStreamBYOBRequest | null;
	readonly desiredSize: number | null;
	close(): void;
	enqueue(chunk: ArrayBufferView<ArrayBuffer>): void;
	error(e?: any): void;
}

export interface ReadableStreamDefaultController<R = any> {
	readonly desiredSize: number | null;
	close(): void;
	enqueue(chunk?: R): void;
	error(e?: any): void;
}

export interface ReadableStreamBYOBReader extends ReadableStreamGenericReader {
	read<T extends ArrayBufferView>(
		view: T,
	): Promise<ReadableStreamReadResult<T>>;
	releaseLock(): void;
}

export interface ReadableStreamDefaultReader<
	R = any,
> extends ReadableStreamGenericReader {
	read(): Promise<ReadableStreamReadResult<R>>;
	releaseLock(): void;
}

export interface ReadableStreamGetReaderOptions {
	mode?: ReadableStreamReaderMode;
}

export interface ReadableStreamIteratorOptions {
	preventCancel?: boolean;
}

export interface ReadableStreamAsyncIterator<T> extends AsyncIteratorObject<
	T,
	BuiltinIteratorReturn,
	unknown
> {
	[Symbol.asyncIterator](): ReadableStreamAsyncIterator<T>;
}

export interface ReadableWritablePair<R = any, W = any> {
	readable: ReadableStream<R>;
	writable: WritableStream<W>;
}

export interface ReadableStream<R = any> {
	readonly locked: boolean;
	cancel(reason?: any): Promise<void>;
	getReader(options: { mode: "byob" }): ReadableStreamBYOBReader;
	getReader(): ReadableStreamDefaultReader<R>;
	getReader(options?: ReadableStreamGetReaderOptions): ReadableStreamReader<R>;
	pipeThrough<T>(
		transform: ReadableWritablePair<T, R>,
		options?: StreamPipeOptions,
	): ReadableStream<T>;
	pipeTo(
		destination: WritableStream<R>,
		options?: StreamPipeOptions,
	): Promise<void>;
	tee(): [ReadableStream<R>, ReadableStream<R>];
	[Symbol.asyncIterator](
		options?: ReadableStreamIteratorOptions,
	): ReadableStreamAsyncIterator<R>;
	values(
		options?: ReadableStreamIteratorOptions,
	): ReadableStreamAsyncIterator<R>;
}

export interface UnderlyingSourceCancelCallback {
	(reason?: any): void | PromiseLike<void>;
}

export interface UnderlyingSourcePullCallback<R> {
	(controller: ReadableStreamController<R>): void | PromiseLike<void>;
}

export interface UnderlyingSourceStartCallback<R> {
	(controller: ReadableStreamController<R>): any;
}

export interface UnderlyingSource<R = any> {
	autoAllocateChunkSize?: number;
	cancel?: UnderlyingSourceCancelCallback;
	pull?: UnderlyingSourcePullCallback<R>;
	start?: UnderlyingSourceStartCallback<R>;
	type?: ReadableStreamType;
}

export interface UnderlyingByteSource {
	autoAllocateChunkSize?: number;
	cancel?: UnderlyingSourceCancelCallback;
	pull?: (controller: ReadableByteStreamController) => void | PromiseLike<void>;
	start?: (controller: ReadableByteStreamController) => any;
	type: "bytes";
}

export interface UnderlyingDefaultSource<R = any> {
	cancel?: UnderlyingSourceCancelCallback;
	pull?: (
		controller: ReadableStreamDefaultController<R>,
	) => void | PromiseLike<void>;
	start?: (controller: ReadableStreamDefaultController<R>) => any;
	type?: undefined;
}

export interface UnderlyingSinkAbortCallback {
	(reason?: any): void | PromiseLike<void>;
}

export interface UnderlyingSinkCloseCallback {
	(): void | PromiseLike<void>;
}

export interface UnderlyingSinkStartCallback {
	(controller: WritableStreamDefaultController): any;
}

export interface UnderlyingSinkWriteCallback<W> {
	(
		chunk: W,
		controller: WritableStreamDefaultController,
	): void | PromiseLike<void>;
}

export interface UnderlyingSink<W = any> {
	abort?: UnderlyingSinkAbortCallback;
	close?: UnderlyingSinkCloseCallback;
	start?: UnderlyingSinkStartCallback;
	type?: undefined;
	write?: UnderlyingSinkWriteCallback<W>;
}

export interface WritableStreamDefaultController {
	readonly signal: AbortSignal;
	error(e?: any): void;
}

export interface WritableStreamDefaultWriter<W = any> {
	readonly closed: Promise<void>;
	readonly desiredSize: number | null;
	readonly ready: Promise<void>;
	abort(reason?: any): Promise<void>;
	close(): Promise<void>;
	releaseLock(): void;
	write(chunk?: W): Promise<void>;
}

export interface WritableStream<W = any> {
	readonly locked: boolean;
	abort(reason?: any): Promise<void>;
	close(): Promise<void>;
	getWriter(): WritableStreamDefaultWriter<W>;
}

export interface TransformerFlushCallback<O> {
	(controller: TransformStreamDefaultController<O>): void | PromiseLike<void>;
}

export interface TransformerStartCallback<O> {
	(controller: TransformStreamDefaultController<O>): any;
}

export interface TransformerTransformCallback<I, O> {
	(
		chunk: I,
		controller: TransformStreamDefaultController<O>,
	): void | PromiseLike<void>;
}

export interface Transformer<I = any, O = any> {
	flush?: TransformerFlushCallback<O>;
	readableType?: undefined;
	start?: TransformerStartCallback<O>;
	transform?: TransformerTransformCallback<I, O>;
	writableType?: undefined;
}

export interface TransformStreamDefaultController<O = any> {
	readonly desiredSize: number | null;
	enqueue(chunk?: O): void;
	error(reason?: any): void;
	terminate(): void;
}

export interface TransformStream<I = any, O = any> {
	readonly readable: ReadableStream<O>;
	readonly writable: WritableStream<I>;
}

export interface BlobPropertyBag {
	endings?: EndingType;
	type?: string;
}

export interface Blob {
	readonly size: number;
	readonly type: string;
	arrayBuffer(): Promise<ArrayBuffer>;
	// bytes(): Promise<Uint8Array<ArrayBuffer>>;
	slice(start?: number, end?: number, contentType?: string): Blob;
	stream(): ReadableStream<Uint8Array<ArrayBuffer>>;
	text(): Promise<string>;
}

export interface FilePropertyBag extends BlobPropertyBag {
	lastModified?: number;
}

export interface File extends Blob {
	readonly lastModified: number;
	readonly name: string;
	readonly webkitRelativePath: string;
}

export interface URL {
	hash: string;
	host: string;
	hostname: string;
	href: string;
	toString(): string;
	readonly origin: string;
	password: string;
	pathname: string;
	port: string;
	protocol: string;
	search: string;
	readonly searchParams: URLSearchParams;
	username: string;
	toJSON(): string;
}

export interface URLConstructor {
	new (url: string | URL, base?: string | URL): URL;
	canParse(url: string | URL, base?: string | URL): boolean;
	createObjectURL(obj: Blob): string;
	parse(url: string | URL, base?: string | URL): URL | null;
	revokeObjectURL(url: string): void;
}

export interface URLSearchParamsIterator<T> extends IteratorObject<
	T,
	BuiltinIteratorReturn,
	unknown
> {
	[Symbol.iterator](): URLSearchParamsIterator<T>;
}

export interface URLSearchParams {
	readonly size: number;
	append(name: string, value: string): void;
	delete(name: string, value?: string): void;
	get(name: string): string | null;
	getAll(name: string): string[];
	has(name: string, value?: string): boolean;
	set(name: string, value: string): void;
	sort(): void;
	toString(): string;
	forEach(
		callbackfn: (value: string, key: string, parent: URLSearchParams) => void,
		thisArg?: any,
	): void;
	[Symbol.iterator](): URLSearchParamsIterator<[string, string]>;
	entries(): URLSearchParamsIterator<[string, string]>;
	keys(): URLSearchParamsIterator<string>;
	values(): URLSearchParamsIterator<string>;
}

export interface HeadersIterator<T> extends IteratorObject<
	T,
	BuiltinIteratorReturn,
	unknown
> {
	[Symbol.iterator](): HeadersIterator<T>;
}

export interface Headers {
	append(name: string, value: string): void;
	delete(name: string): void;
	get(name: string): string | null;
	getSetCookie(): string[];
	has(name: string): boolean;
	set(name: string, value: string): void;
	forEach(
		callbackfn: (value: string, key: string, parent: Headers) => void,
		thisArg?: any,
	): void;
	[Symbol.iterator](): HeadersIterator<[string, string]>;
	entries(): HeadersIterator<[string, string]>;
	keys(): HeadersIterator<string>;
	values(): HeadersIterator<string>;
}

export interface FormDataIterator<T> extends IteratorObject<
	T,
	BuiltinIteratorReturn,
	unknown
> {
	[Symbol.iterator](): FormDataIterator<T>;
}

export interface FormData {
	append(name: string, value: string | Blob): void;
	append(name: string, value: string): void;
	append(name: string, blobValue: Blob, filename?: string): void;
	delete(name: string): void;
	get(name: string): FormDataEntryValue | null;
	getAll(name: string): FormDataEntryValue[];
	has(name: string): boolean;
	set(name: string, value: string | Blob): void;
	set(name: string, value: string): void;
	set(name: string, blobValue: Blob, filename?: string): void;
	forEach(
		callbackfn: (
			value: FormDataEntryValue,
			key: string,
			parent: FormData,
		) => void,
		thisArg?: any,
	): void;
	[Symbol.iterator](): FormDataIterator<[string, FormDataEntryValue]>;
	entries(): FormDataIterator<[string, FormDataEntryValue]>;
	keys(): FormDataIterator<string>;
	values(): FormDataIterator<FormDataEntryValue>;
}

export interface Body {
	readonly body: ReadableStream<Uint8Array<ArrayBuffer>> | null;
	readonly bodyUsed: boolean;
	arrayBuffer(): Promise<ArrayBuffer>;
	blob(): Promise<Blob>;
	// bytes(): Promise<Uint8Array<ArrayBuffer>>;
	formData(): Promise<FormData>;
	json(): Promise<any>;
	text(): Promise<string>;
}

export interface RequestInit {
	body?: BodyInit | null;
	cache?: RequestCache;
	credentials?: RequestCredentials;
	headers?: HeadersInit;
	integrity?: string;
	keepalive?: boolean;
	method?: string;
	mode?: RequestMode;
	priority?: RequestPriority;
	redirect?: RequestRedirect;
	referrer?: string;
	referrerPolicy?: ReferrerPolicy;
	signal?: AbortSignal | null;
	window?: null;
}

export interface Request extends Body {
	readonly cache: RequestCache;
	readonly credentials: RequestCredentials;
	readonly destination: RequestDestination;
	readonly headers: Headers;
	readonly integrity: string;
	readonly keepalive: boolean;
	readonly method: string;
	readonly mode: RequestMode;
	readonly redirect: RequestRedirect;
	readonly referrer: string;
	readonly referrerPolicy: ReferrerPolicy;
	readonly signal: AbortSignal;
	readonly url: string;
	clone(): Request;
}

export interface RequestConstructor {
	new (input: RequestInfo | URL, init?: RequestInit): Request;
}

export interface ResponseInit {
	headers?: HeadersInit;
	status?: number;
	statusText?: string;
}

export interface Response extends Body {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly redirected: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly type: ResponseType;
	readonly url: string;
	clone(): Response;
}

export interface ResponseConstructor {
	new (body?: BodyInit | null, init?: ResponseInit): Response;
	error(): Response;
	json(data: any, init?: ResponseInit): Response;
	redirect(url: string | URL, status?: number): Response;
}

export type FetchFunction = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;
