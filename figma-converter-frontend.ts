import * as FigmaEndpoint from "figma-js";
import { Figma } from "./figma-definitions";
import { VDOM } from "./vdom-definitions";

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

export function getVDOMByFileId(fileId: string, token: string): Promise<VDOM.Node | null> {
  const figmaClient = FigmaEndpoint.Client({
    personalAccessToken: token
  });
  return new Promise(resolve => {figmaClient.file(fileId).then(response => {
    const data = JSON.stringify(response.data, undefined, "  ");
    const fileNode: Figma.File = JSON.parse(data);
    const imageIds = { jpg: [], png: [], svg: [] };
    getImageIds(imageIds, fileNode.document);
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
  });
}