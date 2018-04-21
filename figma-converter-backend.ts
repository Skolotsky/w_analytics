import { VDOM } from "./vdom-definitions";
export type NodePath = { node: VDOM.Node; parentPath?: NodePath };

export type Replacer = (
  node: VDOM.Node,
  parentPath: NodePath,
  replacer: Replacer
) => VDOM.Node | string;
export function printVDOMNode(
  node: VDOM.Node,
  replacer?: Replacer,
  path?: NodePath
): string {
  const newPath: NodePath = { node: node, parentPath: path };
  if (replacer) {
    const result = replacer(node, newPath, replacer);
    if (typeof result === "string") {
      return result;
    }
    node = result;
  }
  let childrenHTML = node.children
    ? node.children
        .map(child => printVDOMNode(child, replacer, newPath))
        .join("")
    : "";
  let text = node.text || "";
  if (node.attributes.get("data-type") !== "GROUP") {
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
    //let attributes = '';
    let attributes = node.attributes.size
      ? ` ${([...node.attributes.entries()] as [VDOM.AttributeName, string][])
          //.filter(([name]) => name === "src")
          .map(([name, value]) => `${name}="${value}"`)
          .join(" ")}`
      : "";
    return `<${
      node.tag
    }${attributes}${classes}${style}>${text}${childrenHTML}</${node.tag}>`;
  }
  return `${text}${childrenHTML}`;
}

export function printVDOM(
  document: VDOM.Document,
  replacer?: (node: VDOM.Node, parentPath: NodePath) => VDOM.Node | string
): string {
  return printVDOMNode(document.node, replacer);
}
