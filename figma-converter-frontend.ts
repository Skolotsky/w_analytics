import * as fs from "fs";
import * as request from "request";
import * as FigmaEndpoint from "figma-js";
import { Figma } from "./figma-definitions";
import { VDOM } from "./vdom-definitions";
import * as escapeHTML from 'escape-html';
import * as path from "path";

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

function toFontFamily(ff: string) {
  switch (ff) {
    case "Stratos LC":
      return "Stratos ";
  }
  return ff;
}

function toStyle(typeStyle: Figma.TypeStyle, style: VDOM.Style) {
  style.set("font-family", toFontFamily(typeStyle.fontFamily));
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

function parseRECTANGLE(node: Figma.RECTANGLE, vdomNode: VDOM.Node) {
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

function parseTEXT(node: Figma.TEXT, vdomNode: VDOM.Node) {
  vdomNode.attributes.set("data-name", "text");
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
    if (node.characterStyleOverrides.length < node.characters.length) {
      textParts.push({
        style: node.style,
        text: node.characters.slice(node.characterStyleOverrides.length)
      });
    }
    vdomNode.children = textParts.map(textPart => {
      const vdomNode = VDOM.createNode("SPAN");
      if (textPart.style && textPart.style !== node.style) {
        toStyle(textPart.style, vdomNode.style);
      }
      vdomNode.children = [escapeHTML(textPart.text)];
      return vdomNode;
    });
  } else {
    vdomNode.children = [escapeHTML(node.characters)];
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
}

function parseAbsoluteBoxBounded(
  node: Figma.AbsoluteBoxBounded,
  vdomNode: VDOM.Node,
  parentBox?: Figma.Rectangle
): Figma.Rectangle | null {
  vdomNode.style.set("position", "absolute");
  let parentX = 0;
  let parentY = 0;
  let parentW = Infinity;
  let parentH = Infinity;
  if (parentBox) {
    if (Figma.isGROUP(node)) {
      vdomNode.style.set("left", "0");
      vdomNode.style.set("right", "0");
      vdomNode.style.set("top", "0");
      vdomNode.style.set("bottom", "0");
    }
    parentX = parentBox.x;
    parentY = parentBox.y;
    parentW = parentBox.width;
    parentH = parentBox.height;
  }
  const w = node.absoluteBoundingBox.width;
  const h = node.absoluteBoundingBox.height;
  const xl = node.absoluteBoundingBox.x - parentX;
  let xr = parentW - (xl + w);
  const yt = node.absoluteBoundingBox.y - parentY;
  let yb = parentH - (yt + h);
  const horizontal = node.constraints.horizontal;
  const vertical = node.constraints.vertical;

  vdomNode.box = { xl, xr, yt, yb, w, h };
  if (Figma.isGROUP(node)) {
    return parentBox || null;
  }
  if (horizontal === "LEFT" || horizontal === "LEFT_RIGHT") {
    vdomNode.style.set("left", `${xl}px`);
  }
  if (horizontal === "RIGHT" || horizontal === "LEFT_RIGHT") {
    vdomNode.style.set("right", `${xr}px`);
  }
  if (horizontal === "CENTER") {
    const offset = Math.ceil(w / 2);
    vdomNode.style.set("left", `calc(50% - ${offset}px)`);
    vdomNode.style.set("right", `calc(50% - ${offset}px)`);
  }
  if (horizontal === "SCALE") {
    const lOffset = Math.ceil(xl * 100 / parentW);
    const rOffset = Math.ceil(xr * 100 / parentW);
    const wOffset = Math.ceil(w * 100 / parentW);
    vdomNode.style.set("left", `${lOffset}%`);
    vdomNode.style.set("right", `${rOffset}%`);
    vdomNode.style.set("width", `${wOffset}%`);
  }
  if (horizontal === "LEFT" || horizontal === "RIGHT") {
    vdomNode.style.set("width", `${w}px`);
  }
  if (vertical === "TOP" || vertical === "TOP_BOTTOM") {
    vdomNode.style.set("top", `${yt}px`);
  }
  if (vertical === "BOTTOM" || vertical === "TOP_BOTTOM") {
    vdomNode.style.set("bottom", `${yb}px`);
  }
  if (vertical === "CENTER") {
    const offset = Math.ceil(h / 2);
    vdomNode.style.set("top", `calc(50% - ${offset}px)`);
    vdomNode.style.set("bottom", `calc(50% - ${offset}px)`);
  }
  if (vertical === "SCALE") {
    const tOffset = Math.ceil(yt * 100 / parentH);
    const bOffset = Math.ceil(yb * 100 / parentH);
    const hOffset = Math.ceil(h * 100 / parentH);
    vdomNode.style.set("top", `${tOffset}%`);
    vdomNode.style.set("bottom", `${bOffset}%`);
    vdomNode.style.set("height", `${hOffset}%`);
  }
  if (vertical === "TOP" || vertical === "BOTTOM") {
    vdomNode.style.set("height", `${h}px`);
  }
  return node.absoluteBoundingBox;
}

function parseEffected(node: Figma.Effected, vdomNode: VDOM.Node) {
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
  if (shadows) {
    vdomNode.style.set("box-shadow", shadows);
  }
}

function parseChildren(
  children: Figma.Node[],
  imageURLMap: ImageURLMap,
  components: Figma.ComponentRefMap,
  nodeMap: VDOM.NodeMap,
  parentBox?: Figma.Rectangle
): VDOM.Node[] {
  let vdomChildren: VDOM.Node[] = [];
  children
    .reverse()
    .sort((childA, childB) => {
      if (Figma.isAbsoluteBoxBounded(childA) && Figma.isAbsoluteBoxBounded(childB)) {
        return childA.absoluteBoundingBox.y - childB.absoluteBoundingBox.y;
      }
      return 0;
    })
    .forEach(child => {
      const result = parseNode(
        imageURLMap,
        components,
        child,
        nodeMap,
        parentBox
      );
      if (result) {
        if (result instanceof Array) {
          vdomChildren = vdomChildren.concat(result);
        } else {
          vdomChildren.push(result);
        }
      }
    });
  return vdomChildren;
}

function parseNode(
  imageURLMap: ImageURLMap,
  components: Figma.ComponentRefMap,
  node: Figma.Node,
  nodeMap: VDOM.NodeMap,
  parentBox?: Figma.Rectangle
): VDOM.Node | VDOM.Node[] | null {
  const vdomNode: VDOM.Node = VDOM.createNode();
  vdomNode.attributes.set("id", node.id);
  vdomNode.attributes.set("data-name", node.name);
  vdomNode.attributes.set("data-type", node.type);
  if (Figma.isBOOLEAN_OPERATION(node)) {
    return null;
  }
  if (Figma.isSTAR(node)) {
    return null;
  }
  if (Figma.isLINE(node)) {
    return null;
  }
  if (Figma.isELLIPSE(node)) {
    return null;
  }
  if (Figma.isREGULAR_POLYGON(node)) {
    return null;
  }
  if (Figma.isRECTANGLE(node)) {
    parseRECTANGLE(node, vdomNode);
  }
  if (Figma.isTEXT(node)) {
    parseTEXT(node, vdomNode);
  }
  if (Figma.isCOMPONENT(node)) {
    vdomNode.attributes.set("data-component", node.id);
  }
  let libImage = imageURLMap[node.id] || "";
  if (Figma.isINSTANCE(node)) {
    vdomNode.attributes.set("data-component-id", node.componentId);
    const component = components[node.componentId];
    if (imageURLMap[node.componentId]) {
      libImage = imageURLMap[node.componentId];
    }
    if (component) {
      if (imageURLMap[component.name]) {
        libImage = imageURLMap[component.name];
      }
      vdomNode.attributes.set("data-component-name", component.name);
    }
  }

  vdomNode.style.set("position", "absolute");
  let nodeBox;
  if (Figma.isAbsoluteBoxBounded(node)) {
    nodeBox = parseAbsoluteBoxBounded(node, vdomNode, parentBox);
  }
  if (Figma.isBackgroundColored(node)) {
    vdomNode.style.set("background-color", toCSSColor(node.backgroundColor));
  }
  if (Figma.isEffected(node)) {
    parseEffected(node, vdomNode);
  }
  if (node.visible === false) {
    vdomNode.style.set("display", "none");
  }
  if (libImage) {
    vdomNode.tag = "IMG";
    vdomNode.attributes.set("src", libImage);
  } else if (Figma.isSubTree(node)) {
    vdomNode.children = parseChildren(
      node.children,
      imageURLMap,
      components,
      nodeMap,
      nodeBox
    );
  }
  return vdomNode;
}

export function getFile(fileId: string, token: string): Promise<Figma.File> {
  const figmaClient = FigmaEndpoint.Client({
    personalAccessToken: token
  });
  return new Promise(resolve => {
    const filePath = `data/${fileId}.json`;
    if (process.argv.indexOf("-c") > 0 && fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath).toString();
      const fileNode: Figma.File = JSON.parse(data);
      resolve(fileNode);
    }
    figmaClient.file(fileId).then(response => {
      const data = JSON.stringify(response.data, undefined, "  ");
      if (!fs.existsSync("data/")) {
        fs.mkdirSync("data/");
      }
      fs.writeFileSync(filePath, data);
      const fileNode: Figma.File = JSON.parse(data);
      resolve(fileNode);
    });
  });
}

function download(uri, filename) {
  return new Promise(resolve => {
    request.head(uri, function(err, res) {
      request(uri)
        .pipe(fs.createWriteStream(filename))
        .on("close", () => resolve(filename));
    });
  });
}

type ImageRecords = { [key: string]: string };

function getImageIds(
  imageIds: { jpg: ImageRecords; png: ImageRecords; svg: ImageRecords },
  node: Figma.Node
) {
  if (Figma.isSubTree(node)) {
    node.children.forEach(child => {
      getImageIds(imageIds, child);
    });
  } else if (Figma.isIcon(node)) {
    imageIds[node.exportSettings[0].format.toLowerCase()][node.id] = node.name;
  }
}

export function getImagesByFile(
  fileId: string,
  token: string,
  file: Figma.File,
  byName: boolean = false
): Promise<ImageURLMap> {
  const figmaClient = FigmaEndpoint.Client({
    personalAccessToken: token
  });
  return new Promise(resolve => {
    const imageIds = { jpg: {}, png: {}, svg: {} };
    getImageIds(imageIds, file.document);
    let count = 1;
    let imageURLMap = {};
    function tryEnd(
      newImageURLMap?: ImageURLMap,
      format?: string,
      imageRecords?: ImageRecords
    ) {
      count--;
      if (newImageURLMap && format && imageRecords) {
        if (byName) {
          Object.keys(imageRecords).forEach(id => {
            const name = imageRecords[id];
            imageURLMap[name] = newImageURLMap[id];
          });
        } else {
          imageURLMap = Object.assign(imageURLMap, newImageURLMap);
        }
      }
      if (count === 0) {
        resolve(imageURLMap);
      }
    }
    if (process.argv.indexOf("-c") > 0) {
      Object.keys(imageIds.svg).forEach(id => (imageURLMap[id] = ""));
    } else {
      if (Object.keys(imageIds.jpg).length) {
        count++;
        figmaClient
          .fileImages(fileId, { ids: Object.keys(imageIds.jpg), format: "jpg" })
          .then(response => tryEnd(response.data.images, "jpg", imageIds.jpg));
      }
      if (Object.keys(imageIds.png).length) {
        count++;
        figmaClient
          .fileImages(fileId, { ids: Object.keys(imageIds.png), format: "png" })
          .then(response => tryEnd(response.data.images, "png", imageIds.png));
      }
      if (Object.keys(imageIds.svg).length) {
        count++;
        figmaClient
          .fileImages(fileId, { ids: Object.keys(imageIds.svg), format: "svg" })
          .then(response => tryEnd(response.data.images, "svg", imageIds.svg));
      }
    }
    tryEnd();
  });
}

const IMAGES_PATH = "img";
let index = process.argv.indexOf("-p");
const DOWNLOAD_PATH = index > 0 ? path.resolve(process.argv[index + 1]) : "";
export function downloadImages(fileId: string, imageURLMap: ImageURLMap) {
  if (!fs.existsSync(IMAGES_PATH)) {
    fs.mkdirSync(IMAGES_PATH);
  }
  const imgDir = `${DOWNLOAD_PATH}/${IMAGES_PATH}/${fileId}`;
  if (fs.existsSync(imgDir)) {
    fs.readdirSync(imgDir).forEach(file => fs.unlinkSync(`${imgDir}/${file}`));
    fs.rmdirSync(imgDir);
  }
  fs.mkdirSync(imgDir);
  Object.keys(imageURLMap).forEach(key => {
    const name = key.replace(/:/g, "-").replace(/;/g, "_");
    const fileName = `${IMAGES_PATH}/${name}.svg`;
    if (imageURLMap[key]) {
      download(imageURLMap[key], DOWNLOAD_PATH + "/" + fileName).then(
        fileName => console.log(`${fileName} is downloaded`)
      );
    }
    imageURLMap[key] = fileName;
  });
}

export function getVDOMByFileId(
  fileId: string,
  token: string
): Promise<VDOM.Document> {
  return new Promise(resolve => {
    getFile(fileId, token).then(file =>
      getImagesByFile(fileId, token, file).then(imageURLMap => {
        downloadImages(fileId, imageURLMap);
        console.log(JSON.stringify(imageURLMap, undefined, " "));
        const nodeMap: VDOM.NodeMap = new Map();
        resolve({
          node: parseNode(
            imageURLMap,
            file.components,
            file.document,
            nodeMap
          ) as VDOM.Node,
          nodeMap
        });
      })
    );
  });
}
