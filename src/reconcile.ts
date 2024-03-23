import type { DidactElement, Fiber } from "./didact";

export function reconcileChildren(
	wipFiber: Fiber,
	elements: DidactElement[],
	ctx: {
		deletions: Fiber[];
		wipFiber: Fiber;
	},
) {
	let index = 0;
	let oldFiber = wipFiber.alternate?.child ?? null;
	let prevSibling: Fiber | null = null;

	while (index < elements.length || oldFiber != null) {
		const element = elements[index];
		let newFiber: Fiber | null = null;

		const sameType = oldFiber && element && element.type === oldFiber.type;

		if (sameType) {
			// update the node
			newFiber = {
				// biome-ignore lint/style/noNonNullAssertion: sameTypeでチェック済
				...oldFiber!,
				...({
					props: element.props,
					parent: wipFiber,
					alternate: oldFiber,
					effectTag: "UPDATE",
					child: null,
					sibling: null,
				} as Omit<Fiber, "type" | "dom">),
			} satisfies Fiber;
		}

		if (element && !sameType) {
			// add new node
			newFiber = {
				type: element.type satisfies Fiber["type"],
				props: element.props,
				parent: wipFiber,
				dom: null, // performUnitOfWorkで後から作られる
				alternate: null,
				effectTag: "PLACEMENT",
				child: null,
				sibling: null,
			} as Fiber;
		}

		if (oldFiber && !sameType) {
			// delete the old node

			oldFiber.effectTag = "DELETION";
			ctx.deletions.push(oldFiber);
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}

		if (index === 0) {
			ctx.wipFiber.child = newFiber;
		} else {
			if (prevSibling) {
				prevSibling.sibling = newFiber;
			}
		}

		prevSibling = newFiber;

		index++;
	}
}
