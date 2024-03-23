import * as Didact from "./didact";

const container = document.getElementById("root");
if (container === null) throw new Error("root element not found");

const Hello = ({
	name,
}: {
	name: string;
}) => {
	return (
		<div>
			<h1>Hello {name}!</h1>
		</div>
	);
};

const App = () => {
	const [value, setValue] = Didact.useState("world");
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const updateValue = (e: any) => {
		console.log("updateValue", e.target.value);
		setValue((prev) => {
			console.log("setValue callback", prev, "=>", e.target.value);
			return e.target.value;
		});
	};

	return (
		<div>
			<input onInput={updateValue} value={value} />
			<br />
			<Hello name={value} />
		</div>
	);
};

const element = (
	<div id="foo">
		<a href="./">bar</a>
		<br />

		<App />
	</div>
);

Didact.render(element, container);

// const element = Didact.createElement(
//   "div",
//   { id: "foo" },
//   Didact.createElement("a", null, "bar"),
//   Didact.createElement("b")
// );
