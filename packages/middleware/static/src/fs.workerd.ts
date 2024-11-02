// @ts-expect-error: No typing for this
import manifestText from "__STATIC_CONTENT_MANIFEST";
import { ReadOnlyFile } from ".";

const manifest = JSON.parse(manifestText);

/**
 * File read adapter
 */
export function createFileReader() {
	return function read(
		ctx: {
			platform: {
				env: any;
			};
		},
		file: ReadOnlyFile,
	): BodyInit | Promise<BodyInit> {
		return ctx.platform.env.__STATIC_CONTENT.get(manifest[file.path.slice(1)], {
			type: "stream",
		});
	};
}
