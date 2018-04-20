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

function processBreakpoint(
  node: VDOM.Node,
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
      resetPosition(child);
      child.style.set("position", "relative");
    });
  }
}

const CARD_MARGIN = 36;

const BREAKPOINT_REGEXP = /(en|ru) \((Desktop|Tablet|Mobile)\)/;
const replacers = {
  cards: (
    state: { css: string; breakpoint: string; lang: string },
    node: VDOM.Node,
    path: NodePath,
    replacer: Replacer
  ): VDOM.Node | string => {
    const nodeType = node.attributes.get("data-type");
    if (nodeType === "TEXT") {
      if (path.parentPath) {
        const parentName = path.parentPath.node.attributes.get("data-name");
        switch (parentName) {
          case "Department & City": {
            node.text = "<%= (job['department'] || 'Need Department').upcase %>";
            break;
          }
          case "City": {
            node.text = "<%= job['location']['city'] %>";
            break;
          }
          case "Position Card": {
            node.text = "<%= job['title'] %>";
            break;
          }
        }
      }
    }
    return node;
  },
  careers: (
    state: { css: string; breakpoint: string; lang: string },
    node: VDOM.Node,
    path: NodePath,
    replacer: Replacer
  ): VDOM.Node | string => {
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
        if (!node.children) {
          return "";
        }
        node.style.delete("background-color");
        fillPage(node);
        node.style.set("margin-top", "55px");
        node.style.set("overflow", "hidden");
        const breakpoints: { width: number; className: string }[] = [];
        node.children.slice().forEach(child => {
          const childName = child.attributes.get("data-name");
          const match = childName && childName.match(BREAKPOINT_REGEXP);
          if (match && match[1] === state.lang) {
            processBreakpoint(child, breakpoints);
          } else if (node.children) {
            node.children.splice(node.children.indexOf(child), 1)
          }
        });
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
            child => child.attributes.get("data-name") === "Content"
          );
          if (content) {
            content.style.set("position", "relative");
            node.style.delete("bottom");
          }
        }
        break;
      }
      case "Position Card": {
        node.classes.add('position-card');
        return `<% jobs.each do |job| %>${printVDOMNode(node, replacers.cards.bind(replacers, state))}<% end %>`;
      }
      case "Cards": {
        if (node.box) {
          node.style.set("position", "relative");
          node.style.set("margin-bottom", `${node.box.yt + CARD_MARGIN}px`);
          node.style.delete("height");
          node.style.delete("right");
          if (state.breakpoint !== "Mobile") {
            node.style.set("width", `${node.box.w}px`);
          }
        }
        //node.text = '<%= erb :"dynamic/careers/cards" %>';
        if (node.children && node.children.length) {
          const card = node.children.find(
            child => child.attributes.get("data-name") === "Position Card"
          );
          const fallBack = node.children.find(
            child => child.attributes.get("data-name") === "Fallback Card"
          );
          node.children = [];
          if (card && card.box) {
            resetPosition(card);
            card.style.set("position", "relative");
            if (state.breakpoint === "Mobile") {
              card.style.delete("width");
            } else {
              card.style.set("width", `${card.box.w}px`);
            }
            node.children.push(card);
            node.style.set("padding-left", `${card.box.xl}px`);
            node.style.set("padding-top", `${card.box.yt}px`);
          }
          if (fallBack && fallBack.box) {
            fallBack.classes.add('position-card');
            fallBack.classes.add('fallback-card');
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
          state.breakpoint = match[2];
          node.classes.add("breakpoint-" + match[2].toLowerCase());
        }
        if (node.style.get("display") === "none") {
          return "";
        }
    }
    return node;
  }
};

export function printVDOMbyFieldId(
  fileId: string,
  token: string,
  outDir: string
) {
  getVDOMByFileId(fileId, token).then(vdomNode => {
    const state = { css: `
.position-card {
  margin-bottom: ${CARD_MARGIN}px;
}
.breakpoint-desktop .position-card,
.breakpoint-tablet .position-card {
  float: left;
  margin-right: ${CARD_MARGIN}px;
}
.breakpoint-desktop .fallback-card,
.breakpoint-tablet .fallback-card {
  margin-right: 50%;
}`, breakpoint: "", lang: "en" };
    const html =
      printVDOM(vdomNode, replacers.careers.bind(replacers, state)) +
      `<style>${state.css}</style>`;
    fs.writeFileSync(`${outDir}/careers.erb`, html);
    fs.writeFileSync(`page.html`, html);
    // fs.writeFileSync(
    //   `cards.erb`,
    //   cardWrapper.card
    // );
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
