import { isArray, isString } from "@mini-vue/shared";

type Style = string | Record<string, string | string[]> | null;

// const displayRE = /(^|;)\s*display\s*:/;

export function patchStyle(el: Element, prev: Style, next: Style) {
	const style = (el as HTMLElement).style;
	const isCssString = isString(next);
	// let hasControlledDisplay = false;

	// 新style存在且为对象
	if (next && !isCssString) {
		// 处理删除的style
		if (prev) {
			//旧style存在且为对象
			if (!isString(prev)) {
				for (const key in prev) {
					if (next[key] == null) {
						setStyle(style, key, "");
					}
				}
			} else {
				// 为字符串则分割后处理
				for (const prevStyle of prev.split(";")) {
					const key = prevStyle.slice(0, prevStyle.indexOf(":")).trim();
					if (next[key] == null) {
						setStyle(style, key, "");
					}
				}
			}
		}
		// 处理新增的style
		for (const key in next) {
			if (key === "display") {
				// hasControlledDisplay = true;
			}
			setStyle(style, key, next[key]);
		}
	} else {
		if (isCssString) {
			if (prev !== next) {
				style.cssText = next as string;
				// hasControlledDisplay = displayRE.test(next);
			}
		} else if (prev) {
			el.removeAttribute("style");
		}
	}
}

function setStyle(style: CSSStyleDeclaration, name: string, val: string | string[]) {
	if (isArray(val)) {
		val.forEach((v) => setStyle(style, name, v));
	} else {
		style.setProperty(name, val);
	}
}
