import { Tag } from "nodegit";

export namespace VDOM {
  export type TagName = "DIV" | "SPAN" | "IMG";
  export type ClassName = string;
  export type StylePropertyName =
    | "background-color"
    | "border"
    | "border-left"
    | "border-radius"
    | "border-top"
    | "bottom"
    | "box-shadow"
    | "color"
    | "cursor"
    | "display"
    | "font-family"
    | "font-size"
    | "font-style"
    | "font-weight"
    | "height"
    | "left"
    | "letter-spacing"
    | "line-height"
    | "margin-bottom"
    | "margin-left"
    | "margin-right"
    | "margin-top"
    | "overflow"
    | "overflow-x"
    | "padding-left"
    | "padding-right"
    | "padding-top"
    | "padding-bottom"
    | "position"
    | "right"
    | "text-align"
    | "text-align"
    | "text-overflow"
    | "top"
    | "vertical-align"
    | "visibility"
    | "width";
  export type Style = Map<VDOM.StylePropertyName, string>;
  export type Classes = Set<ClassName>;
  export type AttributeName = string;
  export interface Node {
    tag: TagName;
    classes: Classes;
    style: Style;
    children?: (Node|string)[];
    attributes: Map<AttributeName, string>;
    box?: {
      xl: number;
      xr: number;
      yt: number;
      yb: number;
      w: number;
      h: number;
    };
  }

  export function createNode(tag: TagName = "DIV"): Node {
    return {
      tag: tag,
      classes: new Set(),
      style: new Map(),
      attributes: new Map(),
    };
  }
  export type NodeMap = Map<string, VDOM.Node>;
  export type Document = { node: VDOM.Node; nodeMap: VDOM.NodeMap };
}
