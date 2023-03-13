export type PartStream = AsyncIterableIterator<MultipartPart>;

export interface MultipartPart {
	headers: SimpleHeaders;
	body: ReadableStream<Uint8Array>;
}

export type SimpleHeaders = Map<string, string>;
