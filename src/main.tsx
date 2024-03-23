import * as Didact from "./didact";

const container = document.getElementById("root");
if (container === null) throw new Error("root element not found");

const updateValue = (e: any) => {
	console.log("updateValue", e.target.value);
	rerender(e.target.value);
};

const rerender = (value: string) => {
	console.log(
		`=== rerendering with value:${value} ==============================================`,
	);
	const element = (
		<div id="foo">
			<a href="./">bar</a>
			<br />
			<input onInput={updateValue} value={value} />
			<br />
			<b>{value}</b>
		</div>
	);

	Didact.render(element, container);
};

rerender("hello");

// const element = Didact.createElement(
//   "div",
//   { id: "foo" },
//   Didact.createElement("a", null, "bar"),
//   Didact.createElement("b")
// );
