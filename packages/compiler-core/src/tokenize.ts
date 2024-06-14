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

const isAlpha = (char: string) => /[a-zA-Z]/.test(char);

export function tokenize(str: string) {
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
					nextStr();
				} else if (isAlpha(char)) {
					currentState = State.text;
					charts.push(char);
					nextStr();
				}
				break;
			case State.tagOpen:
				if (char === "/") {
					currentState = State.tagEnd;
					nextStr();
				} else if (isAlpha(char)) {
					currentState = State.tagName;
					charts.push(char);
					nextStr();
				}
				break;
			case State.tagName:
				if (isAlpha(char)) {
					charts.push(char);
					nextStr();
				} else if (char === ">") {
					tokens.push({
						type: "tag",
						name: charts.join("")
					});
					currentState = State.initial;
					charts = [];
					nextStr();
				}
				break;
			case State.text:
				if (char === "<") {
					tokens.push({
						type: "text",
						content: charts.join("")
					});
					currentState = State.tagOpen;
					charts = [];
					nextStr();
				} else if (isAlpha(char)) {
					charts.push(char);
					nextStr();
				}
				break;
			case State.tagEnd:
				if (isAlpha(char)) {
					currentState = State.tagEndName;
					charts.push(char);
					nextStr();
				}
				break;
			case State.tagEndName:
				if (char === ">") {
					tokens.push({
						type: "tagEnd",
						name: charts.join("")
					});
					currentState = State.initial;
					charts = [];
					nextStr();
				} else if (isAlpha(char)) {
					charts.push(char);
					nextStr();
				}
				break;
		}
	}

	return tokens;
}
