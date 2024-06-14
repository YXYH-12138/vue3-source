interface Token {
	type: string;
	name?: string;
	content?: string;
}

const enum State {
	initial, // 初始状态
	tagOpen, // 标签开始
	tagName, // 标签名
	text, // 文本
	tagEnd, // 标签结束
	tagEndName // 标签结束名称
}

export const enum TokenTypes {
	Tag = "tag",
	Text = "text",
	TagEnd = "tagEnd"
}

const isAlpha = (char: string) => /[a-zA-Z]/.test(char);

const isTag = (chat: string) => isAlpha(chat) || /[0-9]/.test(chat);

/**
 * 将模板标记为tokens
 * @param str
 * @returns {Token[]}
 */
export function tokenize(str: string): Token[] {
	let currentState = State.initial;
	let charts: string[] = [];

	const tokens: Token[] = [];

	const nextStr = () => (str = str.slice(1));

	while (str.length) {
		let char = str[0];

		switch (currentState) {
			case State.initial:
				if (char === "<") {
					currentState = State.tagOpen;
				} else if (isAlpha(char)) {
					currentState = State.text;
					charts.push(char);
				}
				nextStr();
				break;
			case State.tagOpen:
				if (char === "/") {
					currentState = State.tagEnd;
				} else if (isAlpha(char)) {
					currentState = State.tagName;
					charts.push(char);
				}
				nextStr();
				break;
			case State.tagName:
				if (isTag(char)) {
					charts.push(char);
				} else if (char === ">") {
					tokens.push({
						type: TokenTypes.Tag,
						name: charts.join("")
					});
					currentState = State.initial;
					charts = [];
				}
				nextStr();
				break;
			case State.text:
				if (char === "<") {
					tokens.push({
						type: TokenTypes.Text,
						content: charts.join("")
					});
					currentState = State.tagOpen;
					charts = [];
				} else {
					charts.push(char);
				}
				nextStr();
				break;
			case State.tagEnd:
				if (isAlpha(char)) {
					currentState = State.tagEndName;
					charts.push(char);
				}
				nextStr();
				break;
			case State.tagEndName:
				if (char === ">") {
					tokens.push({
						type: TokenTypes.TagEnd,
						name: charts.join("")
					});
					currentState = State.initial;
					charts = [];
				} else if (isTag(char)) {
					charts.push(char);
				}
				nextStr();
				break;
			default:
				nextStr();
				break;
		}
	}

	return tokens;
}
