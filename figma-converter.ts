import * as fs from "fs";
import {getVDOMByFileId} from "./figma-converter-frontend";
import {printVDOM} from "./figma-converter-backend";

export function printVDOMbyFieldId(fileId: string, token: string, outFileName: string) {
  getVDOMByFileId(fileId, token).then(vdomNode => {
    fs.writeFileSync(outFileName, vdomNode && printVDOM(vdomNode));
  });
}

function main() {
  const argv = process.argv;
  let index = argv.indexOf('-f');
  const fileId = index > 0 ? argv[index + 1] : '';
  if (!fileId) {
    console.log('need figma file id');
    return;
  }
  index = argv.indexOf('-o');
  const outFileName = index > 0 ? argv[index + 1] : '';
  if (!outFileName) {
    console.log('need output file name');
    return;
  }
  index = argv.indexOf('-t');
  const token = index > 0 ? argv[index + 1] : '';
  if (!token) {
    console.log('need token');
    return;
  }
  printVDOMbyFieldId(fileId, token, outFileName);
}

main()
