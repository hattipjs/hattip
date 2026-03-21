import { expect, it } from "vitest";

it("Response.redirect() uses the UTF-8 URL parser", () => {
	// TODD: wpt
	const response = Response.redirect("http://localhost?\u00FF", 302);
	expect(response.headers.get("Location")!.split("?")[1], "%C3%BF");
});
