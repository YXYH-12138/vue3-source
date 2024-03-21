const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (val: object, key: string | symbol): key is keyof typeof val =>
	hasOwnProperty.call(val, key);

export const NOOP = () => {};

export const extend = Object.assign;

export const isArray = Array.isArray;
export const isMap = (val: unknown): val is Map<any, any> => toTypeString(val) === "[object Map]";
export const isSet = (val: unknown): val is Set<any> => toTypeString(val) === "[object Set]";

export const isDate = (val: unknown): val is Date => toTypeString(val) === "[object Date]";
export const isRegExp = (val: unknown): val is RegExp => toTypeString(val) === "[object RegExp]";
export const isFunction = (val: unknown): val is Function => typeof val === "function";
export const isString = (val: unknown): val is string => typeof val === "string";
export const isSymbol = (val: unknown): val is symbol => typeof val === "symbol";
export const isObject = (val: unknown): val is Record<any, any> =>
	val !== null && typeof val === "object";

export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string => objectToString.call(value);

// 比较值是否已更改，并考虑NaN。
export const hasChanged = (value: any, oldValue: any): boolean => !Object.is(value, oldValue);

export const def = (obj: object, key: string | symbol, value: any) => {
	Object.defineProperty(obj, key, {
		configurable: true,
		enumerable: false,
		value
	});
};

export const toRawType = (value: unknown): string => {
	// extract "RawType" from strings like "[object RawType]"
	return toTypeString(value).slice(8, -1);
};
