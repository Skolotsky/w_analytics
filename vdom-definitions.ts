export namespace VDOM {
  export type TagName = "DIV" | "SPAN" | "IMG";
  export type ClassName = "preserveRatio";
  export type StylePropertyName =
    | "left"
    | "right"
    | "top"
    | "bottom"
    | "width"
    | "height"
    | "border"
    | "border-top"
    | "border-left"
    | "position"
    | "visibility"
    | "background-color"
    | "color"
    | "font-family"
    | "font-size"
    | "font-weight"
    | "font-style"
    | "text-align"
    | "vertical-align"
    | "text-align"
    | "letter-spacing"
    | "line-height"
    | "box-shadow"
    | "border-radius";
  export type Style = Map<VDOM.StylePropertyName, string>;
  export type Classes = Set<ClassName>;
  export type AttributeName = "data-name" | "data-type" | "data-component" | "data-component-id" | "data-component-name" | "src";
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
}