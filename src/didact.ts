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

let nextUnitOfWork: Fiber | null = null;
let currentRoot: Fiber | null = null;
let wipRoot: Fiber | null = null;
let deletions: Fiber[] = [];

export function render(element: DidactElement, container: HTMLElement | Text) {
	console.log("render", element, container);
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		alternate: currentRoot,
	};

	deletions = [];
	nextUnitOfWork = wipRoot;
}

function commitRoot() {
	commitWork(wipRoot?.child);
	currentRoot = wipRoot;
	wipRoot = null;
}

function commitWork(fiber: Fiber | undefined | null) {
	if (!fiber) return;

	const domParent = fiber.parent?.dom;

	if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
		domParent?.appendChild(fiber.dom);
	} else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
		updateDom(fiber.dom, fiber.alternate?.props, fiber.props);
	} else if (fiber.effectTag === "DELETION") {
		domParent?.removeChild(fiber.dom);
	}

	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

const isEvent = (key: string) => key.startsWith("on");
const isProperty = (key: string) => key !== "children" && !isEvent(key);
const isNew = (prev: unknown, next: unknown) => (key: string) =>
	prev[key] !== next[key];
const isGone = (_prev: unknown, next: unknown) => (key: string) =>
	!(key in next);

function updateDom(dom: any, prevProps: unknown, nextProps: unknown) {
	console.group("updateDom", dom, prevProps, nextProps);

	// remove event listeners
	Object.keys(prevProps)
		.filter(isEvent)
		.filter(isEvent)
		.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			console.log("removeEventListener", eventType, prevProps[name]);
			dom.removeEventListener(eventType, prevProps[name]);
		});

	// remove old properties
	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(prevProps, nextProps))
		.forEach((name) => {
			console.log("removeProperty", name);
			dom[name] = "";
		});

	// set new or changed properties
	Object.keys(nextProps)
		.filter(isProperty)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			console.log("setProperty", name, nextProps[name]);
			dom[name] = nextProps[name];
		});

	// add event listeners
	Object.keys(nextProps)
		.filter(isEvent)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			console.log("addEventListener", eventType, nextProps[name]);
			dom.addEventListener(eventType, nextProps[name]);
		});

	console.groupEnd();
}

export type Fiber = {
	type?: "TEXT_ELEMENT" | string | undefined;
	dom: any;
	props: Record<string | number | symbol, unknown>;
	parent?: Fiber;
	child?: Fiber;
	sibling?: Fiber;
	alternate?: Fiber;
};

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

	// if (fiber.parent) {
	// 	fiber.parent.dom.appendChild(fiber.dom);
	// }

	// create new fibers
	const elements = fiber.props.children;
	reconcileChildren(fiber, elements);

	// return next unit of work
	if (fiber.child) {
		return fiber.child;
	}
	let nextFiber = fiber;
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent;
	}
	return null;
}

function reconcileChildren(wipFiber: Fiber, elements: Fiber[]) {
	let index = 0;
	let oldFiber = wipFiber.alternate?.child;
	let prevSibling: Fiber | null = null;

	while (index < elements.length || oldFiber != null) {
		const element = elements[index];
		let newFiber: Fiber | null = null;

		const sameType = oldFiber && element && element.type === oldFiber.type;

		if (sameType) {
			// update the node
			newFiber = {
				// biome-ignore lint/style/noNonNullAssertion: sameTypeでチェック済
				type: oldFiber!.type,
				props: element.props,
				// biome-ignore lint/style/noNonNullAssertion: sameTypeでチェック済
				dom: oldFiber!.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: "UPDATE",
			} satisfies Fiber;
		}

		if (element && !sameType) {
			// add new node
			newFiber = {
				type: element.type,
				props: element.props,
				parent: wipFiber,
				dom: null,
				alternate: undefined,
				effectTag: "PLACEMENT",
			} satisfies Fiber;
		}

		if (oldFiber && !sameType) {
			// delete the old node

			oldFiber.effectTag = "DELETION";
			deletions.push(oldFiber);
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}

		if (index === 0) {
			wipFiber.child = newFiber;
		} else {
			if (prevSibling) {
				prevSibling.sibling = newFiber;
			}
		}

		prevSibling = newFiber;

		index++;
	}
}
