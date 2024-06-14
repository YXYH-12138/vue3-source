import { tokenize } from "../src";

describe("tokenize", () => {
	it("should tokenize a simple template", () => {
		expect(tokenize("<p>Vue</p>")).to.deep.equal([
			{ type: "tag", name: "p" },
			{ type: "text", content: "Vue" },
			{ type: "tagEnd", name: "p" }
		]);
		expect(
			tokenize(`<div>
		  <p>hello Vue</p>
		  <h1>Template</h1>
		</div>`)
		).deep.equal([
			{ type: "tag", name: "div" }, // div 开始标签节点
			{ type: "tag", name: "p" }, // p 开始标签节点
			{ type: "text", content: "hello Vue" }, // 文本节点
			{ type: "tagEnd", name: "p" }, // p 结束标签节点
			{ type: "tag", name: "h1" }, // p 开始标签节点
			{ type: "text", content: "Template" }, // 文本节点
			{ type: "tagEnd", name: "h1" }, // p 结束标签节点
			{ type: "tagEnd", name: "div" } // div 结束标签节点
		]);
	});
});
