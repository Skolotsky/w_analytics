import * as fs from "fs";
import { getVDOMByFileId } from "./figma-converter-frontend";
import { printVDOM } from "./figma-converter-backend";
import { VDOM } from "./vdom-definitions";
import { ok } from "assert";

function fillPage(node: VDOM.Node) {
  node.style.set("left", "0");
  node.style.set("right", "0");
  node.style.set("top", "0");
  node.style.set("bottom", "0");
  node.style.delete("width");
  node.style.delete("height");
}

let css = "";

const replacerMap = {
  VIpCRt4xKu9mfpQXOWogB5G9: node => {
    const nodeName = node.attributes.get("data-name");
    switch (nodeName) {
      case "Document": {
        return replacerMap["VIpCRt4xKu9mfpQXOWogB5G9"](node.children[0]);
      }
      case "Main": {
        fillPage(node);
        node.style.set("overflow-x", "hidden");
        const breakpoints: { width: number; className: string }[] = [];
        node.children.forEach(child => {
          const childName = child.attributes.get("data-name");
          if (childName !== "Position Modal Popup (Desktop, Tablet)") {
            const width = parseInt(child.style.get("width"));
            const className = `figma_bp_${breakpoints.length}`;
            breakpoints.push({width, className});
            child.classes.add(className);
            child.style.set("left", "0");
            child.style.set("right", "0");
            child.style.set("top", "0");
            child.style.delete("width");
          }
        });
        breakpoints.sort((a, b) => {
          return a.width - b.width;
        });
        breakpoints.forEach(({ width, className }, index) => {
          if (index > 0) {
            css += `
@media only screen and (max-width: ${breakpoints[index].width}px) {
  .${className} {
    display: none;
  }
}`;
          }
          if (index + 1 < breakpoints.length) {
            css += `
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
        return '';
      }
    }
    return node;
  }
};

export function printVDOMbyFieldId(
  fileId: string,
  token: string,
  outFileName: string
) {
  getVDOMByFileId(fileId, token).then(vdomNode => {
    fs.writeFileSync(
      `${outFileName}`,
      printVDOM(vdomNode, replacerMap[fileId]) + `<style>${css}</style>`
    );
    console.log(css);
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
  const outFileName = index > 0 ? argv[index + 1] : "";
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
