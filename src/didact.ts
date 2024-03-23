export declare namespace JSX {
	interface IntrinsicElements {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		[elemName: string]: any;
	}
}

export type DidactElement = {
	type: string;
	props: {
		children: DidactElement[];
		[key: string | number | symbol]: unknown;
	};
};

export type DidactChild = DidactElement | string | number;

export type DidactNode =
	| DidactElement
	| string
	| number
	| boolean
	| null
	| undefined;

export function createElement(
	type: string,
	props?: Record<string | number | symbol, unknown> | undefined | null,
	...children: DidactElement[]
): DidactElement {
	return {
		type,
		props: {
			...props,
			children: children.map((child) => {
				return typeof child === "object" ? child : createTextElement(child);
			}),
		},
	};
}

function createTextElement(text: unknown) {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

export function render(element: DidactElement, container: HTMLElement | Text) {
	const dom =
		element.type === "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(element.type);

	for (const child of element.props.children) {
		render(child, dom);
	}

	const isProperty = (key: string) => key !== "children";
	for (const name of Object.keys(element.props).filter(isProperty)) {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		(dom as any)[name] = element.props[name];
	}

	container.appendChild(dom);
}
