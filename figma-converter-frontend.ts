import * as fs from "fs";
import * as request from "request";
import * as FigmaEndpoint from "figma-js";
import { Figma } from "./figma-definitions";
import { VDOM } from "./vdom-definitions";
import * as HTMLDecoderEncoder from "html-encoder-decoder";
import * as path from "path";

const USE_CACHE = process.argv.indexOf("-c") >= 0;

// экранирование текста
function encodeHTML(text): string {
  return HTMLDecoderEncoder.encode(text)
    .replace("&#x2028;", "<br>")
    .replace(/\n([^\n]*)/g, "<p>$1</p>");
}

function toCSSColor(color: Figma.Color): string {
  const r = Math.ceil(color.r * 256);
  const g = Math.ceil(color.g * 256);
  const b = Math.ceil(color.b * 256);
  const a = color.a;
  return `rgba(${r},${g},${b},${a})`;
}

function toCSSTextAlign(
  textAlignHorizontal: Figma.TextAlignHorizontal
): string {
  switch (textAlignHorizontal) {
    case "LEFT":
    case "RIGHT":
    case "CENTER":
      return textAlignHorizontal.toLowerCase();
    case "JUSTIFIED":
      return "justify";
  }
}

function toCSSVerticalAlign(
  textAlignVertical: Figma.TextAlignVertical
): string {
  switch (textAlignVertical) {
    case "TOP":
    case "BOTTOM":
      return textAlignVertical.toLowerCase();
    case "CENTER":
      return "middle";
  }
}

function toCSSFontFamily(ff: string): string {
  switch (ff) {
    case "Stratos LC":
      return "Stratos ";
  }
  return ff;
}

// получить стиль виртуального DOM
function toVDOMStyle(typeStyle: Figma.TypeStyle, style: VDOM.Style) {
  style.set("font-family", toCSSFontFamily(typeStyle.fontFamily));
  if (typeStyle.italic) {
    style.set("font-style", "italic");
  }
  style.set("font-weight", `${typeStyle.fontWeight}`);
  style.set("font-size", `${typeStyle.fontSize}px`);
  if (typeStyle.textAlignHorizontal) {
    style.set("text-align", toCSSTextAlign(typeStyle.textAlignHorizontal));
  }
  if (typeStyle.textAlignVertical) {
    style.set(
      "vertical-align",
      toCSSVerticalAlign(typeStyle.textAlignVertical)
    );
  }
  style.set("letter-spacing", `${typeStyle.letterSpacing}px`);
  style.set("line-height", `${typeStyle.lineHeightPx}px`);
}

type ImageURLMap = { [key: string]: string };

// распарсить прямоугольник
function parseRECTANGLE(node: Figma.RECTANGLE, vdomNode: VDOM.Node) {
  if (node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill && fill.color) {
      if (fill.opacity !== undefined) {
        vdomNode.style.set("opacity", `${fill.opacity}`);
      }
      if (
        node.absoluteBoundingBox.height > 1 &&
        node.absoluteBoundingBox.width > 1
      ) {
        vdomNode.style.set("background-color", `${toCSSColor(fill.color)}`);
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

// парсинг текста
function parseTEXT(node: Figma.TEXT, vdomNode: VDOM.Node) {
  vdomNode.attributes.set("data-name", "text");
  // если текст не в едином стиле - его придётся разбивать
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
        toVDOMStyle(textPart.style, vdomNode.style);
      }
      vdomNode.children = [encodeHTML(textPart.text)];
      return vdomNode;
    });
  } else {
    vdomNode.children = [encodeHTML(node.characters)];
  }
  // распарсим стиль текста
  if (node.style) {
    toVDOMStyle(node.style, vdomNode.style);
  }
  if (node.fills.length > 0) {
    const fill = node.fills[0];
    if (fill && fill.color) {
      if (fill.opacity !== undefined) {
        vdomNode.style.set("opacity", `${fill.opacity}`);
      }
      vdomNode.style.set("color", toCSSColor(fill.color));
    }
  }
}

// парсинг позиционирования
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
    // группа - логическая еденица и часто figma неправильно отдаёт инфу о её позиционировании
    // поэтому мы приравниваем группу к внешнему контейнеру для правильности вычислений
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
  // вычисления относительных позиций
  const w = node.absoluteBoundingBox.width;
  const h = node.absoluteBoundingBox.height;
  const xl = node.absoluteBoundingBox.x - parentX;
  let xr = parentW - (xl + w);
  const yt = node.absoluteBoundingBox.y - parentY;
  let yb = parentH - (yt + h);
  const horizontal = node.constraints.horizontal;
  const vertical = node.constraints.vertical;

  vdomNode.box = { xl, xr, yt, yb, w, h };
  // приравниваем группу к внешнему контейнеру для правильности вычислений
  if (Figma.isGROUP(node)) {
    return parentBox || null;
  }
  // установка позиций в зависимости от привязки
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
    const lOffset = Math.round(xl * 100 / parentW);
    const rOffset = Math.round(xr * 100 / parentW);
    const wOffset = 100 - lOffset - rOffset;
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
    const tOffset = Math.round(yt * 100 / parentH);
    const bOffset = Math.round(yb * 100 / parentH);
    const hOffset = 100 - tOffset - bOffset;
    vdomNode.style.set("top", `${tOffset}%`);
    vdomNode.style.set("bottom", `${bOffset}%`);
    vdomNode.style.set("height", `${hOffset}%`);
  }
  if (vertical === "TOP" || vertical === "BOTTOM") {
    vdomNode.style.set("height", `${h}px`);
  }
  return node.absoluteBoundingBox;
}

// Парсинг эффектов, пока только тени
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
      let result = 0;
      if (
        Figma.isAbsoluteBoxBounded(childA) &&
        Figma.isAbsoluteBoxBounded(childB)
      ) {
        result = childA.absoluteBoundingBox.y - childB.absoluteBoundingBox.y;
        if (result === 0) {
          result = childA.absoluteBoundingBox.x - childB.absoluteBoundingBox.x;
        }
      }
      return result;
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

// Парсинг узла файла figma
function parseNode(
  imageURLMap: ImageURLMap,
  components: Figma.ComponentRefMap,
  node: Figma.Node,
  nodeMap: VDOM.NodeMap,
  parentBox?: Figma.Rectangle
): VDOM.Node | VDOM.Node[] | null {
  const vdomNode: VDOM.Node = VDOM.createNode();
  vdomNode.attributes.set("id", "id" + node.id.replace(":", "-"));
  vdomNode.attributes.set("data-name", node.name);
  vdomNode.attributes.set("data-type", node.type);
  // векторную графику не рисуем
  if (
    Figma.isBOOLEAN_OPERATION(node) ||
    Figma.isSTAR(node) ||
    Figma.isLINE(node) ||
    Figma.isELLIPSE(node) ||
    Figma.isREGULAR_POLYGON(node)
  ) {
    return null;
  }
  // парсим прямоугольник
  if (Figma.isRECTANGLE(node)) {
    parseRECTANGLE(node, vdomNode);
  }
  // парсим текст
  if (Figma.isTEXT(node)) {
    parseTEXT(node, vdomNode);
  }
  // находим связи с комопонентами
  if (Figma.isCOMPONENT(node)) {
    vdomNode.attributes.set("data-component", node.id);
  }
  // получаем библиотечную картинку, если есть
  // на самом деле пока отказались от использования библиотечных картинок
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

  // установка позиционирования
  vdomNode.style.set("position", "absolute");
  let nodeBox;
  if (Figma.isAbsoluteBoxBounded(node)) {
    nodeBox = parseAbsoluteBoxBounded(node, vdomNode, parentBox);
  }
  // установка цвета
  if (Figma.isBackgroundColored(node)) {
    vdomNode.style.set("background-color", toCSSColor(node.backgroundColor));
  }
  // установка эффектов (например тень)
  if (Figma.isEffected(node)) {
    parseEffected(node, vdomNode);
  }
  // установка видимости
  if (node.visible === false) {
    vdomNode.style.set("display", "none");
  }

  // если библиотечная картинка  то будем рисовать её, а не парсить
  if (libImage) {
    vdomNode.tag = "IMG";
    vdomNode.attributes.set("src", libImage);
  } else if (Figma.isSubTree(node)) {
    // обход дочерних элементов
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

// Получение файла figma
export function getFile(fileId: string, token: string): Promise<Figma.File> {
  const figmaClient = FigmaEndpoint.Client({
    personalAccessToken: token
  });
  return new Promise(resolve => {
    const filePath = `data/${fileId}.json`;
    // Если используется кеш, то просто прочитаем существуюший файл
    if (USE_CACHE && fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath).toString();
      const fileNode: Figma.File = JSON.parse(data);
      resolve(fileNode);
    } else {
      // Качаем и сохраняем файл
      figmaClient.file(fileId).then(response => {
        const data = JSON.stringify(response.data, undefined, "  ");
        if (!fs.existsSync("data/")) {
          fs.mkdirSync("data/");
        }
        fs.writeFileSync(filePath, data);
        const fileNode: Figma.File = JSON.parse(data);
        resolve(fileNode);
      });
    }
  });
}

function download(uri, filename): Promise<string> {
  return new Promise(resolve => {
    request.head(uri, function() {
      request(uri)
        .pipe(fs.createWriteStream(filename))
        .on("close", () => resolve(filename));
    });
  });
}

type ImageRecords = { [key: string]: string };

// получение идентефикаторов изображений из дерева файла Figma
function getImageIds(
  imageIds: { jpg: ImageRecords; png: ImageRecords; svg: ImageRecords },
  node: Figma.Node
) {
  if (Figma.isSubTree(node)) {
    node.children.forEach(child => {
      getImageIds(imageIds, child);
    });
  } else if (Figma.isIcon(node)) {
    // записываем идентификатор, если картинка, в соответствии с правилами экспорта
    imageIds[node.exportSettings[0].format.toLowerCase()][node.id] = node.name;
  }
}

// Получить изображения из файла
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
    // собрать идентификаторы изображений
    getImageIds(imageIds, file.document);
    let count = 1;
    let imageURLMap = {};
    // при окончании получения url для каждой группы файлов - слить с результатом и если больше групп нет - завершить
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
    // если используем кеш - не загружаем url из фигмы
    if (USE_CACHE) {
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

// загрузка изображений
const IMAGES_PATH = "img";
let PATH_ARG_INDEX = process.argv.indexOf("-p");
const DOWNLOAD_PATH =
  PATH_ARG_INDEX > 0 ? path.resolve(process.argv[PATH_ARG_INDEX + 1]) : "";
export function downloadImages(fileId: string, imageURLMap: ImageURLMap) {
  if (!fs.existsSync(IMAGES_PATH)) {
    fs.mkdirSync(IMAGES_PATH);
  }
  const imgDir = `${DOWNLOAD_PATH}/${IMAGES_PATH}/${fileId}`;
  // если не используем ранее загруженные данные в качестве кеша - то удалим их
  if (!USE_CACHE) {
    if (fs.existsSync(imgDir)) {
      fs
        .readdirSync(imgDir)
        .forEach(file => fs.unlinkSync(`${imgDir}/${file}`));
      fs.rmdirSync(imgDir);
    }
    fs.mkdirSync(imgDir);
  }
  // Загружаем изображения, для которых есть url
  Object.keys(imageURLMap).forEach(key => {
    const name = key.replace(/:/g, "-").replace(/;/g, "_");
    const fileName = `${name}.svg`;
    if (imageURLMap[key]) {
      download(imageURLMap[key], imgDir + "/" + fileName).then(fileName =>
        console.log(`${fileName} is downloaded`)
      );
    }
    imageURLMap[key] = `${IMAGES_PATH}/${fileId}/${fileName}`;
  });
}

// Получить виртуальный DOM по fileId файла в figma
export function getVDOMByFileId(
  fileId: string,
  token: string
): Promise<VDOM.Document> {
  return new Promise(resolve => {
    // получение файла
    getFile(fileId, token).then(file =>
      // получение картинок из файла
      getImagesByFile(fileId, token, file).then(imageURLMap => {
        // загрузка картинок
        downloadImages(fileId, imageURLMap);
        const nodeMap: VDOM.NodeMap = new Map();
        resolve({
          // узел - результат парсинга
          node: parseNode(
            imageURLMap,
            file.components,
            file.document,
            nodeMap
          ) as VDOM.Node,
          // ассоциативный список узлов по id
          nodeMap
        });
      })
    );
  });
}
