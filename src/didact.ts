import { updateDom } from "./dom";
import { reconcileChildren } from "./reconcile";

export declare namespace JSX {
	interface Element extends DidactElement {}

	interface IntrinsicElements {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		[elemName: string]: any;
	}
}

export type DidactElement = {
	type: Fiber["type"];
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

export type Fiber =
	| FiberFunctionComponent
	| FiberHostComponent
	| FiberTextElement;

type FiberBase = {
	props: {
		children: DidactElement[];
		[key: string | number | symbol]: unknown;
	};
	parent: Fiber | null;
	child: Fiber | null;
	sibling: Fiber | null;
	alternate: Fiber | null;
	effectTag?: "PLACEMENT" | "UPDATE" | "DELETION";
	hooks?: unknown[];
};

export type FiberFunctionComponent = FiberBase & {
	type: (props: FiberBase["props"]) => JSX.Element;
	dom: null;
};

export type FiberHostComponent = FiberBase & {
	type: keyof HTMLElementTagNameMap;
	dom: HTMLElement | null;
};

export type FiberTextElement = FiberBase & {
	type: "TEXT_ELEMENT";
	dom: Text | null;
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

	const domParent = (() => {
		// FunctionComponentでないFiber、つまりdomを持つFiberまで遡る
		let parentFiber = fiber.parent;
		while (!parentFiber?.dom) {
			parentFiber = parentFiber?.parent ?? null;
		}
		return parentFiber.dom;
	})();

	if (fiber.dom !== null) {
		if (fiber.effectTag === "PLACEMENT") {
			console.log("addNode", fiber.dom);
			domParent?.appendChild(fiber.dom);
		}
		if (fiber.effectTag === "UPDATE") {
			console.log("updateNode", fiber.dom);
			updateDom(fiber.dom, fiber.alternate?.props ?? {}, fiber.props);
		}
		if (fiber.effectTag === "DELETION") {
			console.log("removeNode", fiber.dom);
			domParent?.removeChild(fiber.dom);
		}
	}

	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

export function createDom(fiber: FiberTextElement | FiberHostComponent) {
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
	if (fiber.type instanceof Function) {
		updateFunctionComponent(fiber as FiberFunctionComponent);
	} else {
		updateHostComponent(fiber as FiberHostComponent | FiberTextElement);
	}

	if (fiber.child) {
		// return next unit of work
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

let wipFiber: FiberFunctionComponent | null = null;
let hookIndex = 0;

function updateFunctionComponent(fiber: FiberFunctionComponent): void {
	wipFiber = fiber;
	hookIndex = 0;
	wipFiber.hooks = [];

	const children = [fiber.type(fiber.props)];
	reconcileChildren(fiber, children, {
		deletions,
	});
}

function updateHostComponent(
	fiber: FiberHostComponent | FiberTextElement,
): void {
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}

	reconcileChildren(fiber, fiber.props.children, {
		deletions,
	});
}

export function useState<T>(initial: T): [T, (action: (prev: T) => T) => void] {
	console.log("useState");
	type UseStateHook = {
		state: T;
		queue: ((value: T) => T)[];
	};

	const oldHook = wipFiber?.alternate?.hooks?.[hookIndex] as
		| UseStateHook
		| undefined;
	const hook: UseStateHook = {
		state: oldHook ? oldHook.state : initial,
		queue: [],
	};

	console.log("hook", hook);

	const actions = oldHook?.queue ?? [];
	actions.forEach((action) => {
		hook.state = action(hook.state);
	});

	const setState = (action: (prev: T) => T) => {
		hook.queue.push(action);
		wipRoot = {
			dom: currentRoot?.dom,
			props: currentRoot?.props,
			alternate: currentRoot,
		} as Fiber; //TODO: fix this
		nextUnitOfWork = wipRoot;
		deletions = [];
	};

	wipFiber?.hooks?.push(hook);
	hookIndex++;
	return [hook.state, setState];
}
