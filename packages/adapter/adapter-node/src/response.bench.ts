import { bench, describe } from "vitest";
import { HattipResponse } from "./HattipResponse";

describe.each([
	{
		name: "text",
		async run(R: typeof Response) {
			const response = new R("😊");
			await response.text();
		},
	},
	{
		name: "json",
		async run(R: typeof Response) {
			const response = new R('{"a": 1}');
			await response.json();
		},
	},
])("$name", ({ run }) => {
	bench("native", () => run(Response));
	bench("hattip", () => run(HattipResponse as any));
});
