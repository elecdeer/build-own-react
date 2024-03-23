import * as Didact from "./didact";

const element = (
	<div id="foo">
		<a href="./">bar</a>
		<b>bold!</b>
	</div>
);

// const element = Didact.createElement(
//   "div",
//   { id: "foo" },
//   Didact.createElement("a", null, "bar"),
//   Didact.createElement("b")
// );

const container = document.getElementById("root");
if (container === null) throw new Error("root element not found");
Didact.render(element, container);
