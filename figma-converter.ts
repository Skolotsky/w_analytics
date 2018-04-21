import * as fs from "fs";
import { getVDOMByFileId } from "./figma-converter-frontend";
import {
  NodePath,
  printVDOM,
  printVDOMNode,
  Replacer
} from "./figma-converter-backend";
import { VDOM } from "./vdom-definitions";
import * as path from "path";

function resetPosition(node: VDOM.Node) {
  node.style.delete("position");
  node.style.delete("left");
  node.style.delete("right");
  node.style.delete("top");
  node.style.delete("bottom");
}

function fillPage(node: VDOM.Node) {
  resetPosition(node);
  node.style.delete("width");
  node.style.set("position", "relative");
  node.style.delete("height");
}

function isString(node: any): node is string {
  return typeof node == "string";
}

function isNode(
  node: string | VDOM.Node | null | undefined
): node is VDOM.Node {
  return !!node && !isString(node);
}

function processMobileSectionGroups(
  node: VDOM.Node,
  offset: number = 0
): { offset: number; paddingBottom: number } {
  if (node.box) {
    resetPosition(node);
    node.style.delete("width");
    node.style.delete("height");
    node.style.set("position", "relative");
    node.style.set("padding-right", `${node.box.xr}px`);
    node.style.set("padding-left", `${node.box.xl}px`);
  }
  let paddingBottom = node.box ? node.box.h : 0;
  if (node.children) {
    node.children.forEach(child => {
      if (isNode(child) && child.box) {
        const nodeType = child.attributes.get("data-type");
        if (nodeType === "GROUP") {
          let result = processMobileSectionGroups(child, offset);
          offset = result.offset;
          paddingBottom = Math.min(paddingBottom, result.paddingBottom);
        } else {
          resetPosition(child);
          child.style.set("position", "relative");
          child.style.set("margin-left", `${child.box.xl}px`);
          child.style.set("margin-right", `${child.box.xr}px`);
          const offsetTop = child.box.yt - offset;
          if (offsetTop < 0) {
            child.style.set("margin-top", `${offsetTop}px`);
          } else {
            child.style.set("padding-top", `${offsetTop}px`);
          }
          paddingBottom = Math.min(paddingBottom, child.box.yb);
          child.style.delete("height");
          if (nodeType !== "TEXT") {
            if (child.tag === "IMG") {
              child.style.set("display", "block");
            }
            child.style.set("width", `${child.box.w}px`);
            child.style.set("height", `${offsetTop + child.box.h}px`);
          }
          offset = child.box.yt + child.box.h;
        }
      }
    });
  }
  return { offset, paddingBottom };
}

function processSection(node: VDOM.Node, breakpoint: string) {
  resetPosition(node);
  node.style.set("position", "relative");
  const nodeName = node.attributes.get("data-name");
  if (
    breakpoint == "Mobile" &&
    nodeName !== "Open Positions" &&
    nodeName !== "Gallery"
  ) {
    node.style.delete("height");
    if (node.children) {
      const content = node.children.find(
        child =>
          isNode(child) && child.attributes.get("data-name") === "Content"
      );
      if (isNode(content)) {
        let { paddingBottom } = processMobileSectionGroups(content);
        node.style.set("padding-bottom", `${paddingBottom}px`);
      }
    }
  }
}

function processBreakpoint(
  node: VDOM.Node,
  breakpoint: string,
  breakpoints: { width: number; className: string }[]
) {
  if (node.box) {
    const width = node.box.w;
    const className = `figma_bp_${breakpoints.length}`;
    breakpoints.push({ width, className });
    node.classes.add(className);
    node.attributes.set("data-breackpoint", `${width}px`);
  }
  fillPage(node);
  if (node.children) {
    node.children.forEach(child => {
      if (isNode(child)) {
        processSection(child, breakpoint);
      }
    });
  }
}

const CARD_MARGIN = 36;

const BREAKPOINT_REGEXP = /(en|ru) \((Desktop|Tablet|Mobile)\)/;
const replacers = {
  cards: (
    state: { css: string; breakpoint: string; lang: string },
    node: VDOM.Node | string,
    path: NodePath,
    replacer: Replacer
  ): VDOM.Node | string => {
    if (isString(node)) {
      return node;
    }
    const nodeType = node.attributes.get("data-type");
    if (nodeType === "TEXT") {
      if (path.parentPath) {
        if (isNode(path.parentPath.node)) {
          const parentName = path.parentPath.node.attributes.get("data-name");
          switch (parentName) {
            case "Department & City": {
              node.children = [
                "<%= (job['department'] || 'Need Department').upcase %>"
              ];
              node.classes.add("card-title");
              break;
            }
            case "City": {
              node.children = ["<%= job['location']['city'] %>"];
              node.classes.add("card-title");
              break;
            }
            case "Position Card": {
              node.children = ["<%= job['title'] %>"];
              node.classes.add("card-text");
              break;
            }
          }
        }
      }
    }
    const nodeName = node.attributes.get("data-name");
    if (nodeName === "City" && node.children) {
      node.children = [
        "<% if job['location']['city'] %>",
        ...node.children,
        "<% end %>"
      ];
    }
    if (nodeName === "Position Card") {
      return node;
    }
    return replacers.careers(state, node, path, replacer);
  },
  careers: (
    state: { css: string; breakpoint: string; lang: string },
    node: VDOM.Node | string,
    path: NodePath,
    replacer: Replacer
  ): VDOM.Node | string => {
    if (isString(node)) {
      return node;
    }
    const nodeName = node.attributes.get("data-name");
    switch (nodeName) {
      case "Document": {
        if (!node.children) {
          return "";
        }
        return replacer(
          node.children[0],
          {
            node: node,
            parentPath: path
          },
          replacer
        );
      }
      case "Gallery": {
        node.children = ['<%= erb :"dynamic/careers/gallery" %>'];
        break;
      }
      case "Tooltip": {
        return "";
      }
      case "Tooltip": {
        return "";
      }
      case "Menus/Mobile/Black":
      case "Menus/Tablet/Black":
      case "Menus/Desktop/Black":
      case "Footers/wheely.com/Mobile":
      case "Footers/wheely.com/Tablet":
      case "Footers/wheely.com/Desktop": {
        return "";
      }
      case "Main": {
        node = Object.assign({}, node) as VDOM.Node;
        if (!node.children) {
          return "";
        }
        node.style.delete("background-color");
        fillPage(node);
        node.style.set("margin-top", "55px");
        node.style.set("overflow", "hidden");
        const breakpoints: { width: number; className: string }[] = [];
        const children: VDOM.Node[] = [];
        node.children.forEach(child => {
          if (isNode(child)) {
            const childName = child.attributes.get("data-name");
            const match = childName && childName.match(BREAKPOINT_REGEXP);
            if (match && match[1] === state.lang) {
              processBreakpoint(child, match[2], breakpoints);
              children.push(child);
            }
          }
        });
        node.children = children;
        breakpoints.sort((a, b) => {
          return a.width - b.width;
        });
        breakpoints.forEach(({ width, className }, index) => {
          if (index > 0) {
            state.css += `
@media only screen and (max-width: ${breakpoints[index].width}px) {
  .${className} {
    display: none;
  }
}`;
          }
          if (index + 1 < breakpoints.length) {
            state.css += `
@media only screen and (min-width: ${breakpoints[index + 1].width + 1}px) {
  .${className} {
    display: none;
  }
}`;
          }
        });
        break;
      }
      case "Position Modal Popup (Desktop, Tablet)": {
        return "";
      }
      case "Open Positions": {
        node.style.set("position", "relative");
        node.style.delete("height");
        if (node.children && node.children.length) {
          const content = node.children.find(
            child =>
              isNode(child) && child.attributes.get("data-name") === "Content"
          );
          if (isNode(content)) {
            content.style.set("position", "relative");
            node.style.delete("bottom");
          }
        }
        break;
      }
      case "Position Card": {
        node.classes.add("position-card");
        return `<% jobs.each do |job| %>${printVDOMNode(
          node,
          replacers.cards.bind(replacers, state)
        )}<% end %>`;
      }
      case "Cards": {
        node.classes.add("cards");
        node.attributes.set("data-type", "FRAME");
        if (node.box) {
          node.style.set("position", "relative");
          node.style.set("margin-left", `${node.box.xl}px`);
          node.style.set("margin-right", `${node.box.xr}px`);
          node.style.set("padding-top", `${node.box.yt}px`);
          node.style.delete("left");
          node.style.delete("top");
          node.style.delete("right");
          node.style.delete("bottom");
          if (state.breakpoint !== "Mobile") {
            node.style.set("width", `${node.box.w + CARD_MARGIN}px`);
          }
        }
        //node.text = '<%= erb :"dynamic/careers/cards" %>';
        if (node.children && node.children.length) {
          const card = node.children.find(
            child =>
              isNode(child) &&
              child.attributes.get("data-name") === "Position Card"
          );
          const fallBack = node.children.find(
            child =>
              isNode(child) &&
              child.attributes.get("data-name") === "Fallback Card"
          );
          node.children = [];
          if (isNode(card) && card.box) {
            resetPosition(card);
            card.style.set("position", "relative");
            if (state.breakpoint === "Mobile") {
              card.style.delete("width");
            } else {
              card.style.set("width", `${card.box.w}px`);
            }
            node.children.push(card);
            //node.style.set("padding-left", `${card.box.xl}px`);
            //node.style.set("padding-top", `${card.box.yt}px`);
          }
          if (isNode(fallBack) && fallBack.box) {
            fallBack.classes.add("position-card");
            fallBack.classes.add("fallback-card");
            resetPosition(fallBack);
            fallBack.style.set("position", "relative");
            if (state.breakpoint === "Mobile") {
              fallBack.style.delete("width");
            } else {
              fallBack.style.set("width", `${fallBack.box.w}px`);
            }
            node.children.push(fallBack);
          }
        }
        return node;
      }
      default:
        const match = nodeName && nodeName.match(BREAKPOINT_REGEXP);
        if (match) {
          if (match[1] === state.lang) {
            state.breakpoint = match[2];
            node.classes.add("breakpoint-" + match[2].toLowerCase());
          } else {
            return "";
          }
        }
        if (node.style.get("display") === "none") {
          return "";
        }
    }
    if (node.tag === "IMG") {
      const src = node.attributes.get("src") || "";
      node.attributes.set("src", `<%= img_url_prefix %>/${src}`);
    }
    return node;
  }
};

function initState(lang: string) {
  return {
    css: `
.cards:after {
  content: '';
  display: block;
  clear: both;
}
.card-text,
.card-title {
  text-overflow: ellipsis;
  overflow: hidden;
}
.card-title {
  white-space: nowrap;
}
.position-card {
  margin-bottom: ${CARD_MARGIN}px;
  cursor: pointer;
}
.breakpoint-desktop .position-card,
.breakpoint-tablet .position-card {
  float: left;
  margin-right: ${CARD_MARGIN}px;
}
.breakpoint-desktop .fallback-card,
.breakpoint-tablet .fallback-card {
  margin-right: 50%;
}
.fallback-card [data-type='TEXT'] {
  text-overflow: ellipsis;
  overflow: hidden;
}`,
    breakpoint: "",
    lang
  };
}

function printTemplate(vdomNode: VDOM.Document, outDir: string, lang: string) {
  const state = initState(lang);
  const html =
    printVDOM(vdomNode, replacers.careers.bind(replacers, state)) +
    `<style>${state.css}</style>`;
  fs.writeFileSync(`${outDir}/careers_${lang}.erb`, html);
  fs.writeFileSync(
    `careers_${lang}.html`,
    html.replace(/<%= img_url_prefix %>\//g, "")
  );
}

export function printVDOMbyFieldId(
  fileId: string,
  token: string,
  outDir: string
) {
  getVDOMByFileId(fileId, token).then(vdomNode => {
    printTemplate(vdomNode, outDir, "en");
    printTemplate(vdomNode, outDir, "ru");
  });
}

function main() {
  const argv = process.argv;
  let index = argv.indexOf("-f");
  const fileId = index > 0 ? argv[index + 1] : "";
  if (!fileId) {
    console.log("need figma file id");
    return;
  }
  index = argv.indexOf("-o");
  const outFileName = index > 0 ? path.resolve(argv[index + 1]) : "";
  if (!outFileName) {
    console.log("need output file name");
    return;
  }
  index = argv.indexOf("-t");
  const token = index > 0 ? argv[index + 1] : "";
  if (!token) {
    console.log("need token");
    return;
  }
  printVDOMbyFieldId(fileId, token, outFileName);
}

main();
