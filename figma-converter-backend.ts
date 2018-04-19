import { VDOM } from "./vdom-definitions";

export function printVDOM(node: VDOM.Node): string {
  let childrenHTML = node.children ? node.children.map(printVDOM).join("") : "";
  let text = node.text || "";
  let style = node.style.size
    ? ` style="${([...node.style.entries()] as [
        VDOM.StylePropertyName,
        string
      ][])
        .map(([name, value]) => `${name}: ${value}`)
        .join(";")}"`
    : "";
  let classes = node.classes.size
    ? ` class="${[...node.classes.keys()].join(" ")}"`
    : "";
  let attributes = node.attributes.size
    ? ` ${([...node.attributes.entries()] as [VDOM.AttributeName, string][])
        .map(([name, value]) => `${name}="${value}"`)
        .join(" ")}`
    : "";

  return `<${node.tag}${attributes}${classes}${style}>${text}${childrenHTML}</${
    node.tag
  }>`;
}
