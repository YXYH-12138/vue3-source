import { VNode } from "./vnode";

type Props = Record<string, any>;
type SetupContext = {
	attrs: Record<string, any>;
	slots: any;
	emit: (event: string, ...payload: any[]) => void;
};

type SetupFn = (props: Props, context: SetupContext) => Record<string, any> | (() => VNode);

export interface DefineComponentProps {
	name?: string;
	props?: Record<string, any>;
	setup: SetupFn;
	[key: string]: any;
}

export function defineComponent(props: DefineComponentProps) {
	return props;
}
