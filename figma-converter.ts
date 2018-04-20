import * as fs from "fs";
import { getVDOMByFileId } from "./figma-converter-frontend";
import { NodePath, printVDOM } from "./figma-converter-backend";
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
  node.style.set("width", "100%");
  node.style.delete("position");
  node.style.delete("height");
}
const replacers = {
  careers: (
    cssWrapper: { css: string },
    node: VDOM.Node,
    path: NodePath
  ): VDOM.Node | string => {
    const nodeName = node.attributes.get("data-name");
    switch (nodeName) {
      case "Document": {
        if (!node.children) {
          return "";
        }
        return replacers.careers(cssWrapper, node.children[0], {
          node: node,
          parentPath: path
        });
      }
      case "Menus/Mobile/Black":
      case "Menus/Tablet/Black":
      case "Menus/Desktop/Black": {
        if (path.parentPath) {
          const parent = path.parentPath.node;
          if (parent.children) {
            parent.children.forEach(child => {
              resetPosition(child);
              node.style.set("width", "100%");
              child.style.set("position", "relative");
            });
          }
        }
        return "";
      }
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
        node.children.forEach(child => {
          const childName = child.attributes.get("data-name");
          if (childName !== "Position Modal Popup (Desktop, Tablet)") {
            if (child.box) {
              const width = child.box.w;
              const className = `figma_bp_${breakpoints.length}`;
              breakpoints.push({ width, className });
              child.classes.add(className);
              child.attributes.set("data-breackpoint", `${width}px`);
            }
            fillPage(child);
          }
        });
        breakpoints.sort((a, b) => {
          return a.width - b.width;
        });
        breakpoints.forEach(({ width, className }, index) => {
          if (index > 0) {
            cssWrapper.css += `
@media only screen and (max-width: ${breakpoints[index].width}px) {
  .${className} {
    display: none;
  }
}`;
          }
          if (index + 1 < breakpoints.length) {
            cssWrapper.css += `
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
      case "Cards": {
        if (node.box) {
          node.style.set("position", "relative");
          node.style.set("margin-bottom", `${node.box.yt + node.box.xl}px`);
          node.style.delete("height");
          node.style.delete("right");
          node.style.set("width", `${node.box.w}`);
        }
        node.text = '<%= erb :"dynamic/careers/cards" %>';
        if (node.children && node.children.length) {
          const card = node.children.find(
            child => child.attributes.get("data-name") === "Position Card"
          );
          const fallBack = node.children.find(
            child => child.attributes.get("data-name") === "Fallback Card"
          );
          node.children = [];
          if (fallBack && fallBack.box) {
            resetPosition(fallBack);
            fallBack.style.set("position", "relative");
            node.children.push(fallBack);
          }
        }
        return node;
      }
      default:
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
    const cssWrapper = { css: "" };
    const cardWrapper = { card: "" };
    fs.writeFileSync(
      `${outDir}/careers.erb`,
      printVDOM(vdomNode, (node, path) =>
        replacers.careers(cssWrapper, node, path)
      ) + `<style>${cssWrapper.css}</style>`
    );
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
