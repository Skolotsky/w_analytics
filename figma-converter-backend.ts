import { VDOM } from "./vdom-definitions";

export function printVDOMNode(
  node: VDOM.Node | string,
  replacer?: (node: VDOM.Node | string) => VDOM.Node | string
): string {
  if (replacer) {
    node = replacer(node);
  }
  if (typeof node === "string") {
    return node;
  }
  let childrenHTML = node.children
    ? node.children.map(child => printVDOMNode(child, replacer)).join("")
    : "";
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

export function printVDOM(
  document: VDOM.Document,
  replacer?: () => VDOM.Node | string
): string {
  return printVDOMNode(document.node, replacer);
}
