import { tokenize } from "../src/tokenize";

describe("tokenize", () => {
	it("should tokenize a simple template", () => {
		expect(tokenize("<p>Vue</p>")).to.deep.equal([
			{ type: "tag", name: "p" },
			{ type: "text", content: "Vue" },
			{ type: "tagEnd", name: "p" }
		]);
		expect(
			tokenize(`<div>
      <p>Vue</p>
      <p>Template</p>
    </div>`)
		).deep.equal([
			{ type: "tag", name: "div" }, // div 开始标签节点
			{ type: "tag", name: "p" }, // p 开始标签节点
			{ type: "text", content: "Vue" }, // 文本节点
			{ type: "tagEnd", name: "p" }, // p 结束标签节点
			{ type: "tag", name: "p" }, // p 开始标签节点
			{ type: "text", content: "Template" }, // 文本节点
			{ type: "tagEnd", name: "p" }, // p 结束标签节点
			{ type: "tagEnd", name: "div" } // div 结束标签节点
		]);
	});
});
