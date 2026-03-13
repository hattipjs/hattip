declare global {
	interface Request {}
	interface Response {}
}

export interface PlatformBase {
	name: string;
}

export interface RequestContext<Platform extends PlatformBase = PlatformBase> {
	platform: Platform;
	request: Request;
}

export type HattipHandler<P extends PlatformBase> = (
	context: RequestContext<P>,
) => Response | Promise<Response>;
