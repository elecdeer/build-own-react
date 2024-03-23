import { updateDom } from "./dom";
import { reconcileChildren } from "./reconcile";

export declare namespace JSX {
	interface IntrinsicElements {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		[elemName: string]: any;
	}
}

export type DidactElement = {
	type: "TEXT_ELEMENT" | keyof HTMLElementTagNameMap;
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

export type Fiber = {
	type: "TEXT_ELEMENT" | keyof HTMLElementTagNameMap;
	dom: HTMLElement | Text | null;
	props: {
		children: DidactElement[];
		[key: string | number | symbol]: unknown;
	};
	parent: Fiber | null;
	child: Fiber | null;
	sibling: Fiber | null;
	alternate: Fiber | null;
	effectTag?: "PLACEMENT" | "UPDATE" | "DELETION";
};

export function createElement(
	type: keyof HTMLElementTagNameMap,
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

function createTextElement(text: unknown): DidactElement {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

let nextUnitOfWork: Fiber | null = null;
let currentRoot: Fiber | null = null;
let wipRoot: Fiber | null = null;
let deletions: Fiber[] = [];

export function render(element: DidactElement, container: HTMLElement) {
	console.log("render", element, container);
	wipRoot = {
		type: container.tagName as keyof HTMLElementTagNameMap,
		dom: container,
		props: {
			children: [element],
		},
		alternate: currentRoot,
		child: null,
		parent: null,
		sibling: null,
	} satisfies Fiber;

	deletions = [];
	nextUnitOfWork = wipRoot;
}

function commitRoot() {
	commitWork(wipRoot?.child ?? null);
	currentRoot = wipRoot;
	wipRoot = null;
}

function commitWork(fiber: Fiber | null) {
	if (!fiber) return;

	const domParent = fiber.parent?.dom ?? null;

	if (fiber.dom !== null) {
		console.log("commitWork", fiber.dom);
		if (fiber.effectTag === "PLACEMENT") {
			domParent?.appendChild(fiber.dom);
		}
		if (fiber.effectTag === "UPDATE") {
			updateDom(fiber.dom, fiber.alternate?.props ?? {}, fiber.props);
		}
		if (fiber.effectTag === "DELETION") {
			domParent?.removeChild(fiber.dom);
		}
	}

	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

export function createDom(fiber: Fiber) {
	const dom =
		fiber.type === "TEXT_ELEMENT"
			? document.createTextNode("")
			: document.createElement(fiber.type);

	updateDom(dom, {}, fiber.props);
	return dom;
}

function workLoop(deadline: IdleDeadline) {
	let shouldYield = false;

	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}

	if (!nextUnitOfWork && wipRoot) {
		commitRoot();
	}

	requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Fiber): Fiber | null {
	// add dom node
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}

	// create new fibers
	const elements = fiber.props.children;
	reconcileChildren(fiber, elements, {
		deletions,
		wipFiber: fiber,
	});

	// return next unit of work
	if (fiber.child) {
		return fiber.child;
	}
	let nextFiber: Fiber | null = fiber;
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent;
	}
	return null;
}
