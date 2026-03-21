/* eslint-disable @typescript-eslint/ban-ts-comment */

export interface PlatformBase {
	name: string;
}

// @ts-ignore: No type
type GlobalResponse = Response;
// @ts-ignore: No type
type GlobalRequest = Request;
// @ts-ignore: No type
type BodyInit = ConstructorParameters<typeof Response>[0];
// @ts-ignore: No type
type ResponseInit = ConstructorParameters<typeof Response>[1];

export class RequestContext<Platform extends PlatformBase = PlatformBase> {
	constructor(platform: Platform, request: GlobalRequest) {
		this.platform = platform;
		this.request = request;
	}

	platform: Platform;
	request: GlobalRequest;

	response(body?: BodyInit | null, init?: ResponseInit): GlobalResponse {
		// @ts-ignore: No type
		return new Response(body, init);
	}

	json(data: any, init?: ResponseInit): InstanceType<GlobalResponse> {
		// @ts-expect-error
		return Response.json(data, init);
	}
}

export type HattipHandler<Ctx extends RequestContext = RequestContext> = (
	ctx: Ctx,
) => GlobalResponse | Promise<GlobalResponse>;
