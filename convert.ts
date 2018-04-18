import * as fs from "fs";
import * as FigmaEndpoint from "figma-js";
import AttributeName = VDOM.AttributeName;

const figmaClient = FigmaEndpoint.Client({
  personalAccessToken: ""
});

namespace Figma {
  export type Id = string;
  export type Type =
    | "DOCUMENT"
    | "CANVAS"
    | "FRAME"
    | "GROUP"
    | "VECTOR"
    | "BOOLEAN_OPERATION"
    | "STAR"
    | "LINE"
    | "ELLIPSE"
    | "REGULAR_POLYGON"
    | "RECTANGLE"
    | "TEXT"
    | "SLICE"
    | "COMPONENT"
    | "INSTANCE";
  export type Date = string;
  export type URL = string;
  export type Range0to1 = number;

  export interface Color {
    r: Range0to1;
    g: Range0to1;
    b: Range0to1;
    a: Range0to1;
  }
  export type ImageFormat = "JPG" | "PNG" | "SVG";
  export interface ExportSetting {
    suffix: string;
    format: ImageFormat;
    constraint: Constraint;
  }
  export type ConstraintType = "SCALE" | "WIDTH" | "HEIGHT";
  export interface Constraint {
    type: ConstraintType;
    value: number;
  }
  export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  export type NormalBlendMode = "PASS_THROUGH" | "NORMAL";
  export type DarkenBlendMode =
    | "DARKEN"
    | "MULTIPLY"
    | "LINEAR_BURN"
    | "COLOR_BURN";
  export type LightenBlendMode =
    | "LIGHTEN"
    | "SCREEN"
    | "LINEAR_DODGE"
    | "COLOR_DODGE";
  export type ContrastBlendMode = "OVERLAY" | "SOFT_LIGHT" | "HARD_LIGHT";
  export type InversionBlendMode = "DIFFERENCE" | "EXCLUSION";
  export type ComponentBlendMode =
    | "HUE"
    | "SATURATION"
    | "COLOR"
    | "LUMINOSITY";
  export type BlendMode =
    | NormalBlendMode
    | DarkenBlendMode
    | LightenBlendMode
    | ContrastBlendMode
    | InversionBlendMode
    | ComponentBlendMode;
  export type VerticalConstraint =
    | "TOP"
    | "BOTTOM"
    | "CENTER"
    | "TOP_BOTTOM"
    | "SCALE";
  export type HorizontelConstraint =
    | "LEFT"
    | "RIGHT"
    | "CENTER"
    | "LEFT_RIGHT"
    | "SCALE";
  export interface LayoutConstraint {
    vertical: VerticalConstraint;
    horizontal: HorizontelConstraint;
  }
  export type LayoutGridPattern = "COLUMNS" | "ROWS" | "GRID";
  export type LayoutGridAligment = "MIN" | "MAX" | "CENTER";
  export interface LayoutGrid {
    pattern: LayoutGridPattern;
    sectionSize: number;
    visible: boolean;
    color: Color;
    alignment: LayoutGridAligment;
    gutterSize: number;
    offset: number;
    count: number;
  }
  export type EffectType =
    | "INNER_SHADOW"
    | "DROP_SHADOW"
    | "LAYER_BLUR"
    | "BACKGROUND_BLUR";
  export interface Effect {
    type: EffectType;
    visible: boolean;
    radius: number;
    color: Color;
    blendMode: BlendMode;
    offset: Vector;
  }
  export type PaintType =
    | "SOLID"
    | "GRADIENT_LINEAR"
    | "GRADIENT_RADIAL"
    | "GRADIENT_ANGULAR"
    | "GRADIENT_DIAMOND"
    | "IMAGE"
    | "EMOJI";
  export type ScaleMode = "FILL" | "FIT" | "TILE" | "STRETCH";
  export interface Paint {
    type: PaintType;
    visible: Boolean;
    opacity: Number;
    color?: Color;
    gradientHandlePositions: Vector[];
    gradientStops: ColorStop[];
    scaleMode: ScaleMode;
  }
  export interface Vector {
    x: number;
    y: number;
  }
  export interface FrameOffset {
    node_id: Id;
    node_offset: Vector;
  }
  export interface ColorStop {
    position: Range0to1;
    color: Color;
  }
  export type TextAlignHorizontal = "LEFT" | "RIGHT" | "CENTER" | "JUSTIFIED";
  export type TextAlignVertical = "TOP" | "CENTER" | "BOTTOM";
  export interface TypeStyle {
    fontFamily: string;
    fontPostScriptName: string;
    italic: boolean;
    fontWeight: number;
    fontSize: number;
    textAlignHorizontal?: TextAlignHorizontal;
    textAlignVertical?: TextAlignVertical;
    letterSpacing: number;
    fills: Paint[];
    lineHeightPx: number;
    lineHeightPercent: number;
  }
  export interface Component {
    name: string;
    description: string;
  }
  export interface Comment {
    id: Id;
    client_meta: Vector | FrameOffset;
    file_key: string;
    parent_id: Id;
    user: User;
    created_at: Date;
    resolved_at: Date;
    order_id: number;
  }
  export interface User {
    handle: string;
    img_url: URL;
  }
  export interface Version {
    id: Id;
    created_at: Date;
    label: string;
    description: String;
    user: User;
  }

  export interface ComponentRef {
    name: string;
    description: string;
  }

  export type ComponentRefMap = { [key: string]: ComponentRef };
  export interface File {
    name: string;
    schemaVersion: number;
    lastModified: Date;
    thumbnailUrl: URL;
    document: DOCUMENT;
    components: ComponentRefMap;
  }
  export interface Node {
    id: Id;
    name: string;
    visible?: boolean;
    type: Type;
  }
  export interface DOCUMENT extends Node {}
  export interface CANVAS extends Node {
    children: Node[];
    backgroundColor: Color;
    exportSettings: ExportSetting[];
  }
  export interface FRAME extends Node {
    children: Node[];
    backgroundColor: Color;
    exportSettings: ExportSetting[];
    blendMode: BlendMode;
    preserveRatio: Boolean;
    constraints: LayoutConstraint;
    transitionNodeID: Id;
    opacity: Number;
    absoluteBoundingBox: Rectangle;
    clipsContent: Boolean;
    layoutGrids: LayoutGrid[];
    effects: Effect[];
    isMask: Boolean;
  }
  export interface GROUP extends FRAME {}
  export type StrokeAlign = "INSIDE" | "OUTSIDE" | "CENTER";
  export interface VECTOR extends Node {
    exportSettings: ExportSetting[];
    blendMode: BlendMode;
    preserveRatio: boolean;
    constraints: LayoutConstraint;
    transitionNodeID: Id;
    opacity: number;
    absoluteBoundingBox: Rectangle;
    effects: Effect[];
    isMask: boolean;
    fills: Paint[];
    strokes: Paint[];
    strokeWeight: number;
    strokeAlign: StrokeAlign;
  }
  export interface BOOLEAN_OPERATION extends VECTOR {
    children: Node[];
  }
  export interface STAR extends VECTOR {}
  export interface LINE extends VECTOR {}
  export interface ELLIPSE extends VECTOR {}
  export interface REGULAR_POLYGON extends VECTOR {}
  export interface RECTANGLE extends VECTOR {
    cornerRadius: number;
  }
  export interface TEXT extends VECTOR {
    characters: string;
    style: TypeStyle;
    characterStyleOverrides: number[];
    styleOverrideTable: { [key: number]: TypeStyle };
  }
  export interface SLICE extends Node {
    exportSettings: ExportSetting[];
    absoluteBoundingBox: Rectangle;
  }
  export interface COMPONENT extends FRAME {}
  export interface INSTANCE extends FRAME {
    componentId: Id;
  }
  export function isDOCUMENT(node: Figma.Node): node is Figma.DOCUMENT {
    return node.type === "DOCUMENT";
  }
  export function isCANVAS(node: Figma.Node): node is Figma.CANVAS {
    return node.type === "CANVAS";
  }
  export function isFRAME(node: Figma.Node): node is Figma.FRAME {
    switch (node.type) {
      case "FRAME":
      case "GROUP":
      case "COMPONENT":
      case "INSTANCE":
        return true;
    }
    return false;
  }
  export function isGROUP(node: Figma.Node): node is Figma.GROUP {
    return node.type === "GROUP";
  }
  export function isVECTOR(node: Figma.Node): node is Figma.VECTOR {
    switch (node.type) {
      case "BOOLEAN_OPERATION":
      case "STAR":
      case "LINE":
      case "ELLIPSE":
      case "REGULAR_POLYGON":
      case "RECTANGLE":
      case "TEXT":
        return true;
    }
    return false;
  }
  export function isBOOLEAN_OPERATION(
    node: Figma.Node
  ): node is Figma.BOOLEAN_OPERATION {
    return node.type === "BOOLEAN_OPERATION";
  }
  export function isSTAR(node: Figma.Node): node is Figma.STAR {
    return node.type === "STAR";
  }
  export function isLINE(node: Figma.Node): node is Figma.LINE {
    return node.type === "LINE";
  }
  export function isELLIPSE(node: Figma.Node): node is Figma.ELLIPSE {
    return node.type === "ELLIPSE";
  }
  export function isREGULAR_POLYGON(
    node: Figma.Node
  ): node is Figma.REGULAR_POLYGON {
    return node.type === "REGULAR_POLYGON";
  }
  export function isRECTANGLE(node: Figma.Node): node is Figma.RECTANGLE {
    return node.type === "RECTANGLE";
  }
  export function isTEXT(node: Figma.Node): node is Figma.TEXT {
    return node.type === "TEXT";
  }
  export function isSLICE(node: Figma.Node): node is Figma.SLICE {
    return node.type === "SLICE";
  }
  export function isCOMPONENT(node: Figma.Node): node is Figma.COMPONENT {
    return node.type === "COMPONENT";
  }
  export function isINSTANCE(node: Figma.Node): node is Figma.INSTANCE {
    return node.type === "INSTANCE";
  }

  export interface SubTree extends Node {
    children: Node[];
  }
  export interface AbsoluteBoxBounded extends Node {
    absoluteBoundingBox: Rectangle;
    constraints: LayoutConstraint;
  }
  export interface BackgroundColored extends Node {
    backgroundColor: Color;
  }
  export interface Effected extends Node {
    effects: Effect[];
  }
  export interface Exportable extends Node {
    exportSettings: ExportSetting[];
  }
  export interface Icon extends Exportable {}

  export function isSubTree<T extends Figma.Node>(
    node: T
  ): node is T & Figma.SubTree {
    return !isIcon(node) && !!node["children"];
  }
  export function isAbsoluteBoxBounded<T extends Figma.Node>(
    node: T
  ): node is T & Figma.AbsoluteBoxBounded {
    return !!node["absoluteBoundingBox"];
  }
  export function isExportable<T extends Figma.Node>(
    node: T
  ): node is T & Figma.Icon {
    return !!node["exportSettings"];
  }
  export function isBackgroundColored<T extends Figma.Node>(
    node: T
  ): node is T & Figma.BackgroundColored {
    return !!node["backgroundColor"];
  }
  export function isEffected<T extends Figma.Node>(
    node: T
  ): node is T & Figma.Effected {
    return !!node["effects"];
  }
  export function isIcon<T extends Figma.Node>(
    node: T
  ): node is T & Figma.Icon {
    return isExportable(node) && node.exportSettings.length > 0;
  }
}
namespace VDOM {
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
  export type AttributeName =
    | "data-name"
    | "data-type"
    | "data-component"
    | "data-component-id"
    | "data-component-name"
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
}

function toCSSColor(color: Figma.Color) {
  const r = Math.ceil(color.r * 256);
  const g = Math.ceil(color.g * 256);
  const b = Math.ceil(color.b * 256);
  const a = color.a;
  return `rgba(${r},${g},${b},${a})`;
}

function toTextAlign(textAlignHorizontal: Figma.TextAlignHorizontal) {
  switch (textAlignHorizontal) {
    case "LEFT":
    case "RIGHT":
    case "CENTER":
      return textAlignHorizontal.toLowerCase();
    case "JUSTIFIED":
      return "justify";
  }
}

function toVerticalAlign(textAlignVertical: Figma.TextAlignVertical) {
  switch (textAlignVertical) {
    case "TOP":
    case "BOTTOM":
      return textAlignVertical.toLowerCase();
    case "CENTER":
      return "middle";
  }
}

function toStyle(typeStyle: Figma.TypeStyle, style: VDOM.Style) {
  style.set("font-family", typeStyle.fontFamily);
  if (typeStyle.italic) {
    style.set("font-style", "italic");
  }
  style.set("font-weight", `${typeStyle.fontWeight}`);
  style.set("font-size", `${typeStyle.fontSize}px`);
  if (typeStyle.textAlignHorizontal) {
    style.set("text-align", toTextAlign(typeStyle.textAlignHorizontal));
  }
  if (typeStyle.textAlignVertical) {
    style.set("vertical-align", toVerticalAlign(typeStyle.textAlignVertical));
  }
  style.set("letter-spacing", `${typeStyle.letterSpacing}px`);
  style.set("line-height", `${typeStyle.lineHeightPx}px`);
}

type ImageURLMap = { [key: string]: string };

function parseNode(
  imageURLMap: ImageURLMap,
  components: Figma.ComponentRefMap,
  node: Figma.Node,
  parent?: Figma.Node
): VDOM.Node | null {
  const vdomNode: VDOM.Node = VDOM.createNode();
  vdomNode.attributes.set("data-name", node.name);
  vdomNode.attributes.set("data-type", node.type);
  //vdomNode.style.set("position", `absolute`);
  if (Figma.isDOCUMENT(node)) {
  }
  if (Figma.isCANVAS(node)) {
  }
  if (Figma.isFRAME(node)) {
    if (node.preserveRatio) {
      vdomNode.classes.add("preserveRatio");
    }
  }
  if (Figma.isGROUP(node)) {
  }
  if (Figma.isVECTOR(node)) {
  }
  if (Figma.isBOOLEAN_OPERATION(node)) {
  }
  if (Figma.isSTAR(node)) {
  }
  if (Figma.isLINE(node)) {
  }
  if (Figma.isELLIPSE(node)) {
  }
  if (Figma.isREGULAR_POLYGON(node)) {
  }
  if (Figma.isRECTANGLE(node)) {
    if (node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill && fill.color) {
        if (
          node.absoluteBoundingBox.height > 1 &&
          node.absoluteBoundingBox.width > 1
        ) {
          vdomNode.style.set(
            "border",
            `${node.strokeWeight}px solid ${toCSSColor(fill.color)}`
          );
        } else if (node.absoluteBoundingBox.width > 1) {
          vdomNode.style.set(
            "border-top",
            `${node.strokeWeight}px solid ${toCSSColor(fill.color)}`
          );
        } else {
          vdomNode.style.set(
            "border-left",
            `${node.strokeWeight}px solid ${toCSSColor(fill.color)}`
          );
        }
      }
    }
    if (node.cornerRadius) {
      vdomNode.style.set("border-radius", `${node.cornerRadius}px`);
    }
  }
  if (Figma.isTEXT(node)) {
    if (node.characterStyleOverrides.length) {
      const styleOverrideTable = {
        "0": node.style,
        ...node.styleOverrideTable
      };
      const ranges: { styleNumber: number; start: number; end: number }[] = [
        { styleNumber: 0, start: 0, end: 0 }
      ];
      let prevStyleNumber = 0;
      let end = 0;
      node.characterStyleOverrides.forEach(styleNumber => {
        end++;
        if (styleNumber === prevStyleNumber) {
          ranges[ranges.length - 1].end = end;
        } else {
          prevStyleNumber = styleNumber;
          ranges.push({ styleNumber, start: end - 1, end });
        }
      });
      const textParts = ranges.map(range => ({
        style: styleOverrideTable[range.styleNumber],
        text: node.characters.slice(range.start, range.end)
      }));
      vdomNode.children = textParts.map(textPart => {
        const vdomNode = VDOM.createNode();
        if (textPart.style && textPart.style !== node.style) {
          toStyle(textPart.style, vdomNode.style);
        }
        vdomNode.text = textPart.text;
        vdomNode.tag = "SPAN";
        return vdomNode;
      });
    } else {
      vdomNode.text = node.characters;
    }
    if (node.style) {
      toStyle(node.style, vdomNode.style);
    }
    if (node.fills.length > 0) {
      const textFill = node.fills[0];
      if (textFill && textFill.color) {
        vdomNode.style.set("color", toCSSColor(textFill.color));
      }
    }
    //vdomNode.style.set("word-wrap", "break-word");
  }
  if (Figma.isSLICE(node)) {
  }
  if (Figma.isCOMPONENT(node)) {
    vdomNode.attributes.set("data-component", node.id);
  }
  if (Figma.isINSTANCE(node)) {
    vdomNode.attributes.set("data-component-id", node.componentId);
    const component = components[node.componentId];
    if (component) {
      vdomNode.attributes.set("data-component-name", component.name);
    }
  }

  vdomNode.style.set("position", "absolute");
  if (Figma.isAbsoluteBoxBounded(node)) {
    let parentX = 0;
    let parentY = 0;
    let parentW = Infinity;
    let parentH = Infinity;
    if (parent && Figma.isAbsoluteBoxBounded(parent)) {
      parentX = parent.absoluteBoundingBox.x;
      parentY = parent.absoluteBoundingBox.y;
      parentW = parent.absoluteBoundingBox.width;
      parentH = parent.absoluteBoundingBox.height;
    }
    const xl = node.absoluteBoundingBox.x - parentX;
    let xr = xl + node.absoluteBoundingBox.width;
    const yt = node.absoluteBoundingBox.y - parentY;
    let yb = yt + node.absoluteBoundingBox.height;
    // if (Figma.isTEXT(node)) {
    //   xr = Math.min(xr, parentW);
    //   yb = Math.min(yb, parentH);
    // }
    const w = xr - xl;
    const h = yb - yt;
    const horizontal = node.constraints.horizontal;
    const vertical = node.constraints.vertical;
    if (horizontal === "LEFT" || horizontal === "LEFT_RIGHT") {
      vdomNode.style.set("left", `${xl}px`);
    }
    if (horizontal === "RIGHT" || horizontal === "LEFT_RIGHT") {
      vdomNode.style.set("right", `${parentW - xr}px`);
    }
    if (horizontal === "CENTER") {
      const offset = Math.ceil(w / 2);
      vdomNode.style.set("left", `calc(50% - ${offset}px)`);
      vdomNode.style.set("right", `calc(50% - ${offset}px)`);
    }
    if (horizontal === "SCALE") {
      const offset = Math.ceil((parentW - w) / 2 * 100 / parentW);
      vdomNode.style.set("left", `${offset}%`);
      vdomNode.style.set("right", `${offset}%`);
    }
    if (horizontal === "LEFT" || horizontal === "RIGHT") {
      vdomNode.style.set("width", `${w}px`);
    }
    if (vertical === "TOP" || vertical === "TOP_BOTTOM") {
      vdomNode.style.set("top", `${yt}px`);
    }
    if (vertical === "BOTTOM" || vertical === "TOP_BOTTOM") {
      vdomNode.style.set("bottom", `${parentH - yb}px`);
    }
    if (vertical === "CENTER") {
      const offset = Math.ceil(h / 2);
      vdomNode.style.set("top", `calc(50% - ${offset}px)`);
      vdomNode.style.set("bottom", `calc(50% - ${offset}px)`);
    }
    if (vertical === "SCALE") {
      const offset = Math.ceil((parentH - h) / 2 * 100 / parentH);
      vdomNode.style.set("top", `${offset}%`);
      vdomNode.style.set("bottom", `${offset}%`);
    }
    if (vertical === "TOP" || vertical === "BOTTOM") {
      vdomNode.style.set("height", `${h}px`);
    }
    //vdomNode.style.set("border", `1px solid red`);
  }
  if (Figma.isBackgroundColored(node)) {
    vdomNode.style.set("background-color", toCSSColor(node.backgroundColor));
  }
  if (Figma.isEffected(node)) {
    const visibleEffects = node.effects.filter(effect => effect.visible);
    const shadows = visibleEffects
      .filter(effect => effect.type === "DROP_SHADOW")
      .map(
        effect =>
          `${effect.offset.x}px ${effect.offset.y}px ${
            effect.radius
          }px ${toCSSColor(effect.color)}`
      )
      .join(", ");
    vdomNode.style.set("box-shadow", shadows);
  }
  if (node.visible === false) {
    vdomNode.style.set("visibility", "hidden");
  }
  if (Figma.isIcon(node)) {
    //vdomNode.style.set("background-color", "red");
    vdomNode.tag = "IMG";
    vdomNode.attributes.set("src", imageURLMap[node.id]);
  }
  if (Figma.isSubTree(node)) {
    vdomNode.children = node.children
      .reverse()
      .map(child => parseNode(imageURLMap, components, child, node))
      .filter(vdomChild => !!vdomChild) as VDOM.Node[];
  }
  return vdomNode;
}
function getImageIds(
  imageIds: { jpg: Figma.Id[]; png: Figma.Id[]; svg: Figma.Id[] },
  node: Figma.Node
) {
  if (Figma.isSubTree(node)) {
    let count = node.children.length;
    node.children.forEach(child => {
      getImageIds(imageIds, child);
    });
  } else if (Figma.isIcon(node)) {
    imageIds[node.exportSettings[0].format.toLowerCase()].push(node.id);
  }
}

function printVDOM(node: VDOM.Node): string {
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
    ? ` ${([...node.attributes.entries()] as [AttributeName, string][])
        .map(([name, value]) => `${name}="${value}"`)
        .join(" ")}`
    : "";

  return `<${node.tag}${attributes}${classes}${style}>${text}${childrenHTML}</${
    node.tag
  }>`;
}

function parse(fileId: string, data: string): Promise<VDOM.Node | null> {
  const fileNode: Figma.File = JSON.parse(data);
  const imageIds = { jpg: [], png: [], svg: [] };
  getImageIds(imageIds, fileNode.document);
  return new Promise(resolve => {
    let count = 1;
    let imageURLMap = {};
    function tryEnd(newImageURLMap) {
      count--;
      imageURLMap = Object.assign(imageURLMap, newImageURLMap);
      if (count === 0) {
        resolve(parseNode(imageURLMap, fileNode.components, fileNode.document));
      }
    }
    if (imageIds.jpg.length) {
      count++;
      figmaClient
        .fileImages(fileId, { ids: imageIds.jpg, format: "jpg" })
        .then(response => tryEnd(response.data.images));
    }
    if (imageIds.png.length) {
      count++;
      figmaClient
        .fileImages(fileId, { ids: imageIds.png, format: "png" })
        .then(response => tryEnd(response.data.images));
    }
    if (imageIds.svg.length) {
      count++;
      figmaClient
        .fileImages(fileId, { ids: imageIds.svg, format: "svg" })
        .then(response => tryEnd(response.data.images));
    }
    tryEnd({});
  });
}

function main(fileId: string) {
  //const data = fs.readFileSync("page.json").toString();
  figmaClient.file(fileId).then(response => {
    const data = JSON.stringify(response.data, undefined, "  ");
    fs.writeFileSync("page.json", data);
    parse(fileId, data).then(vdomNode => {
      fs.writeFileSync("page.html", vdomNode && printVDOM(vdomNode));
    });
  });
}

main("VIpCRt4xKu9mfpQXOWogB5G9");
