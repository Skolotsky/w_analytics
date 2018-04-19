export namespace Figma {
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
