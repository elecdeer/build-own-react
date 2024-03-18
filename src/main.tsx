import * as Didact from "./didact";
//

// @jsx Didact.createElement
const element = (
  // @ts-expect-error
  <div id="foo">
    {/* @ts-expect-error */}
    <a href="./">bar</a>
    {/* @ts-expect-error */}
    <b />
    {/* @ts-expect-error */}
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
