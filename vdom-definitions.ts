export namespace VDOM {
  export type TagName = "DIV" | "SPAN" | "IMG";
  export type ClassName = "preserveRatio";
  export type StylePropertyName =
    | "background-color"
    | "border"
    | "border-left"
    | "border-radius"
    | "border-top"
    | "bottom"
    | "box-shadow"
    | "color"
    | "font-family"
    | "font-size"
    | "font-style"
    | "font-weight"
    | "height"
    | "left"
    | "letter-spacing"
    | "line-height"
    | "position"
    | "right"
    | "text-align"
    | "text-align"
    | "top"
    | "vertical-align"
    | "visibility"
    | "width"
    | "display";
  export type Style = Map<VDOM.StylePropertyName, string>;
  export type Classes = Set<ClassName>;
  export type AttributeName =
    | "data-component"
    | "data-component-id"
    | "data-component-name"
    | "data-name"
    | "data-type"
    | "id"
    | "src";
  export interface Node {
    tag: TagName;
    classes: Classes;
    style: Style;
    children?: Node[];
    text?: string;
    attributes: Map<AttributeName, string>;
  }

  export function createNode(): Node {
    return {
      tag: "DIV",
      classes: new Set(),
      style: new Map(),
      attributes: new Map()
    };
  }
  export type NodeMap = Map<string, VDOM.Node>;
  export type Document = { node: VDOM.Node; nodeMap: VDOM.NodeMap };
}
