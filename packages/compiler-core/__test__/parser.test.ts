import { tokenize } from "../src/tokenize";

describe("tokenize", () => {
	it("should tokenize a simple template", () => {
		const source = "<p>Vue</p>";
		const tokens = tokenize(source);
		expect(tokens).to.deep.equal([
			{ type: "tag", name: "p" },
			{ type: "text", content: "Vue" },
			{ type: "tagEnd", name: "p" }
		]);
	});
});
