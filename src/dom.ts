type Props = Record<string, unknown>;
type DomLike = HTMLElement | Text;

const isEvent = (key: string) => key.startsWith("on");
const isProperty = (key: string) => key !== "children" && !isEvent(key);
const isNew = (prev: Props, next: Props) => (key: string) =>
	prev[key] !== next[key];
const isGone = (_prev: Props, next: Props) => (key: string) => !(key in next);

export function updateDom(dom: DomLike, prevProps: Props, nextProps: Props) {
	console.group("updateDom", dom, prevProps, nextProps);

	// remove event listeners
	Object.keys(prevProps)
		.filter(isEvent)
		.filter(isEvent)
		.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			console.log("removeEventListener", eventType, prevProps[name]);
			dom.removeEventListener(eventType, prevProps[name] as EventListener);
		});

	// remove old properties
	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(prevProps, nextProps))
		.forEach((name) => {
			console.log("removeProperty", name);

			(dom as unknown as Record<string, unknown>)[name] = "";
		});

	// set new or changed properties
	Object.keys(nextProps)
		.filter(isProperty)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			console.log("setProperty", name, nextProps[name]);

			(dom as unknown as Record<string, unknown>)[name] = nextProps[name];
		});

	// add event listeners
	Object.keys(nextProps)
		.filter(isEvent)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			console.log("addEventListener", eventType, nextProps[name]);
			dom.addEventListener(eventType, nextProps[name] as EventListener);
		});

	console.groupEnd();
}
