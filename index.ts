import * as FS from "fs";
import * as Path from "path";
import * as TS from "typescript";
import * as CC from "change-case";
import * as Git from "nodegit";
import * as PUML from "node-plantuml";
import * as Diff from "diff";

const EXTEND = "extend";
const MODULE_CHILD_DELIMETER = "~";
const MEMBER_DELIMETER = ".";

function isCallExpressionIsExtending(callExpression: TS.CallExpression) {
  if (TS.isPropertyAccessExpression(callExpression.expression)) {
    const propertyAccessExpression = callExpression.expression;
    if (TS.isIdentifier(propertyAccessExpression.name)) {
      const identifier = propertyAccessExpression.name;
      if (identifier.escapedText === EXTEND) {
        return true;
      }
    }
  }
  return false;
}

function getIdentifierModuleName(
  program: TS.Program,
  identifier: TS.Identifier
): string {
  const checker = program.getTypeChecker();
  const symbol = checker.getSymbolAtLocation(identifier);
  if (symbol && symbol.declarations && symbol.declarations[0]) {
    let declaration: TS.Node = symbol.declarations[0];
    let names: string[] = [];
    if (TS.isBindingElement(declaration)) {
      let node:
        | TS.VariableDeclaration
        | TS.ParameterDeclaration
        | TS.BindingElement = declaration;
      while (TS.isBindingElement(node)) {
        if (node.propertyName && TS.isIdentifier(node.propertyName)) {
          names.push(node.propertyName.text);
        } else if (TS.isIdentifier(node.name)) {
          names.push(node.name.text);
        }
        if (node.parent && TS.isObjectBindingPattern(node.parent)) {
          if (!node.parent.parent) {
            return '';
          }
          node = node.parent.parent;
        }
      }
      declaration = node;
    }
    if (TS.isVariableDeclaration(declaration) && declaration.initializer) {
      return getFullNameByExpression(
        program,
        declaration.initializer,
        names.join(MEMBER_DELIMETER)
      ) || '';
    }
    if (TS.isImportSpecifier(declaration)) {
      if (!declaration.parent || !declaration.parent.parent) {
        return '';
      }
      declaration = declaration.parent.parent;
    }
    if (TS.isImportClause(declaration)) {
      if (declaration.parent && TS.isImportDeclaration(declaration.parent)) {
        const moduleSpecifier = declaration.parent.moduleSpecifier;
        if (TS.isLiteralExpression(moduleSpecifier)) {
          return moduleSpecifier.text;
        }
      }
    }
  }
  return "";
}

function getFullNameByExpression(
  program: TS.Program,
  expression: TS.Expression,
  name?: string
): string | undefined {
  let fullName;
  if (TS.isIdentifier(expression)) {
    const identifier = expression;
    const moduleName = getIdentifierModuleName(program, identifier);
    const base = moduleName || identifier.text;
    fullName = name ? base + MODULE_CHILD_DELIMETER + name : base;
  } else if (
    TS.isPropertyAccessExpression(expression) &&
    TS.isIdentifier(expression.name)
  ) {
    const newName = name
      ? expression.name.text + MEMBER_DELIMETER + name
      : expression.name.text;
    fullName = getFullNameByExpression(program, expression.expression, newName);
  }
  if (aliases.has(fullName)) {
    return aliases.get(fullName);
  }
  return fullName;
}

const aliases = new Map<string, string>([
  ["ember-data/model", "ember-data~Model"]
]);

function getBaseClassFullNameFromCallExpression(
  program: TS.Program,
  callExpression: TS.CallExpression
) {
  if (TS.isPropertyAccessExpression(callExpression.expression)) {
    return getFullNameByExpression(
      program,
      callExpression.expression.expression
    );
  }
  return "";
}

type IRelationship = { type: "hasMany" | "belongsTo"; modelName: string };

interface IClassDefinition {
  classFullName: string;
  baseClassFullName: string;
  mixins: string[];
  attributes: [string, string][];
  relationships: [string, IRelationship][];
}
const classDefinitionMap = new Map<string, IClassDefinition>();
const modelNamesToFullClassNames = new Map<string, string[]>();
function addClassDefinition(
  classFullName: string,
  baseClassFullName: string,
  mixins: string[],
  attributes: [string, string][],
  relationships: [string, IRelationship][]
) {
  classDefinitionMap.set(classFullName, {
    classFullName,
    baseClassFullName,
    mixins,
    attributes,
    relationships
  });
  const modelName = classFullName.split("/models/")[1];
  if (modelName) {
    if (!modelNamesToFullClassNames.has(modelName)) {
      modelNamesToFullClassNames.set(modelName, []);
    }
    const fullNames = modelNamesToFullClassNames.get(modelName);
    if (fullNames) {
      fullNames.push(classFullName);
    }
  }
}

function getModuleName(fileName: string) {
  fileName =
    Path.dirname(fileName) +
    Path.sep +
    Path.basename(fileName, Path.extname(fileName));
  const fileNameParts = fileName.split(Path.sep);
  let index = fileNameParts.indexOf("addon");
  if (index < 0) {
    index = fileNameParts.indexOf("app");
  }
  if (index > 0) {
    const projectPathParts = fileNameParts.slice(0, index);
    const projectPath = projectPathParts.join(Path.sep);
    let projectName = Path.basename(projectPath) || "";
    if (projectName.indexOf("@wheely/") === 0) {
      projectName = projectName.slice("@wheely/".length);
    }
    const moduleNameParts = fileNameParts.slice(index + 1);
    return projectName + Path.sep + moduleNameParts.join(Path.sep);
  }
  return fileName;
}

function parseModelNode(
  program: TS.Program,
  sourceFile: TS.SourceFile,
  node: TS.Node
) {
  switch (node.kind) {
    case TS.SyntaxKind.CallExpression:
      const callExpression = node as TS.CallExpression;
      if (isCallExpressionIsExtending(callExpression)) {
        const baseClassFullName = getBaseClassFullNameFromCallExpression(
          program,
          callExpression
        ) || '';
        const classFullName = getModuleName(sourceFile.fileName);
        const mixins: string[] = [];
        const attributes: [string, string][] = [];
        const relationships: [string, IRelationship][] = [];
        callExpression.arguments.forEach(argument => {
          if (TS.isObjectLiteralExpression(argument)) {
            argument.properties.forEach(property => {
              if (TS.isPropertyAssignment(property)) {
                let propertyName = "";
                if (
                  TS.isIdentifier(property.name) ||
                  TS.isStringLiteral(property.name)
                ) {
                  propertyName = property.name.text;
                }
                if (TS.isCallExpression(property.initializer)) {
                  const callerFullName = getFullNameByExpression(
                    program,
                    property.initializer.expression
                  );
                  switch (callerFullName) {
                    case "ember-data~attr": {
                      const typeArgument = property.initializer.arguments[0];
                      let type: string = "attr";
                      if (typeArgument && TS.isStringLiteral(typeArgument)) {
                        type = type + ".<" + typeArgument.text + ">";
                      }
                      attributes.push([propertyName, type]);
                      break;
                    }
                    case "ember-data~hasMany": {
                      const typeArgument = property.initializer.arguments[0];
                      let modelName = CC.paramCase(propertyName);
                      if (typeArgument && TS.isStringLiteral(typeArgument)) {
                        modelName = typeArgument.text;
                      }
                      relationships.push([
                        propertyName,
                        { type: "hasMany", modelName: modelName }
                      ]);
                      break;
                    }
                    case "ember-data~belongsTo": {
                      const typeArgument = property.initializer.arguments[0];
                      let modelName = CC.paramCase(propertyName);
                      if (typeArgument && TS.isStringLiteral(typeArgument)) {
                        modelName = typeArgument.text;
                      }
                      relationships.push([
                        propertyName,
                        { type: "belongsTo", modelName: modelName }
                      ]);
                      break;
                    }
                  }
                }
              }
            });
          } else if (TS.isIdentifier(argument)) {
            const mixinFullName = getFullNameByExpression(program, argument);
            if (mixinFullName) {
              mixins.push(mixinFullName);
            }
          }
        });
        addClassDefinition(
          classFullName,
          baseClassFullName,
          mixins,
          attributes,
          relationships
        );
      }
      break;
    default:
      TS.forEachChild(node, node => parseModelNode(program, sourceFile, node));
  }
}

function parseModelSourceFile(program: TS.Program, sourceFile: TS.SourceFile) {
  TS.forEachChild(sourceFile, node =>
    parseModelNode(program, sourceFile, node)
  );
}

function parseSourceFile(program: TS.Program, sourceFile: TS.SourceFile) {
  const dirname = Path.dirname(sourceFile.fileName);
  if (Path.basename(dirname) === "models") {
    parseModelSourceFile(program, sourceFile);
  }
}

function parseDirectory(fileNames: string[], path: string) {
  return new Promise(resolve => {
    FS.readdir(path, (err, names) => {
      if (names && names.length) {
        let count = names.length;
        function tryResolve(fileNames) {
          count--;
          if (count === 0) {
            resolve(fileNames);
          }
        }
        names.forEach(name => {
          const newPath = Path.resolve(path, name);
          FS.stat(newPath, (err, stats) => {
            if (stats) {
              if (stats.isDirectory()) {
                parseDirectory(fileNames, newPath).then(tryResolve);
                return;
              } else if (stats.isFile() && Path.extname(newPath) === ".js") {
                fileNames.push(newPath);
              }
            }
            tryResolve(fileNames);
          });
        });
      } else {
        resolve(fileNames);
      }
    });
  });
}

function getClassDefinitionAttributes(classDefinition: IClassDefinition) {
  return classDefinition.attributes
    .map(([name, type]) => `${name} : ${type}`)
    .sort()
    .join("\n");
}

function getClassDefinitionString(classDefinition: IClassDefinition) {
  const attributesString = getClassDefinitionAttributes(classDefinition);
  return `class "${classDefinition.classFullName}" {\n${attributesString}\n}`;
}

function generateImage() {
  console.log("Writing classes.svg");
  //const decode = PUML.decode(FS.readFileSync('classes.puml').toString());
  const gen = PUML.generate("classes.puml", { format: "svg" });
  //decode.out.pipe(gen.in);
  gen.out.pipe(FS.createWriteStream("classes.svg"));
}
function print() {
  console.log("Writing classes.puml");
  const classesToPrint = new Set<string>();
  const relationsStrings: string[] = [];
  classDefinitionMap.forEach((classDefinition, classFullName) => {
    if (process.argv.indexOf("-a") > 0) {
      classesToPrint.add(classFullName);
    }
    if (process.argv.indexOf("-e") > 0) {
      if (classDefinition.baseClassFullName !== "ember-data~Model") {
        const baseClassFullName = classDefinition.baseClassFullName;
        classesToPrint.add(classFullName);
        classesToPrint.add(baseClassFullName);
        relationsStrings.push(
          `\n"${baseClassFullName}" <|-- "${classFullName}"`
        );
      }
    }
    if (process.argv.indexOf("-r") > 0) {
      classDefinition.relationships.forEach(
        ([propertyName, { type, modelName }]) => {
          const currentProjectName = classFullName.split("/")[0];
          const fullNames = modelNamesToFullClassNames.get(modelName);
          let modelFullName = "";
          if (fullNames) {
            fullNames.forEach(fullName => {
              const projectName = fullName.split("/")[0];
              if (
                projectName === "boilerplate" ||
                projectName === currentProjectName
              ) {
                modelFullName = fullName;
              }
            });
          }
          if (modelFullName) {
            classesToPrint.add(modelFullName);
            classesToPrint.add(classFullName);
          }
          if (type === "belongsTo") {
            if (modelFullName) {
              relationsStrings.push(
                `"${classFullName}" o-- "1" "${modelFullName}" : ${propertyName}`
              );
            } else {
              relationsStrings.push(
                `"${classFullName}" : ${modelName} : ${propertyName}`
              );
            }
          } else {
            if (modelFullName) {
              relationsStrings.push(
                `"${classFullName}" o-- "*" "${modelFullName}" : ${propertyName}`
              );
            } else {
              relationsStrings.push(
                `"${classFullName}" : ${modelName}[] : ${propertyName}`
              );
            }
          }
        }
      );
    }
  });
  const strings = ["@startuml"];
  classesToPrint.forEach(classFullName => {
    if (process.argv.indexOf("-n") > 0) {
      const projectName = classFullName.split("/")[0];
      strings.push(`package "${projectName}" {\n  class "${classFullName}"\n}`);
    }
    if (process.argv.indexOf("-d") > 0) {
      if (classDefinitionMap.has(classFullName)) {
        const classDefinition = classDefinitionMap.get(classFullName);

        strings.push(getClassDefinitionString(classDefinition as IClassDefinition));
      }
    }
  });

  strings.push(relationsStrings.join("\n"));
  strings.push("\n@enduml");
  FS.writeFileSync("classes.puml", strings.join("\n"));
}

function output() {
  console.log("Writing output");
  const diffIndex = process.argv.indexOf("--diff");
  if (diffIndex > 0) {
    const modelName1 = process.argv[diffIndex + 1];
    const modelName2 = process.argv[diffIndex + 2];
    const model1 = classDefinitionMap.get(modelName1);
    const model2 = classDefinitionMap.get(modelName2);
    if (!model1) {
      console.log(modelName1 + " not exist");
    }
    if (!model2) {
      console.log(modelName2 + " not exist");
    }
    if (model1 && model2) {
      const attrs1 = getClassDefinitionAttributes(model1).toLowerCase();
      const attrs2 = getClassDefinitionAttributes(model2).toLowerCase();
      const added = ["+"];
      const removed = ["-"];
      Diff.diffLines(attrs1, attrs2).forEach(diff => {
        if (diff.added) {
          added.push(diff.value.trim());
        }
        if (diff.removed) {
          removed.push(diff.value.trim());
        }
      });
      console.log("Writing diff.txt");
      const content = [
        modelName1,
        attrs1,
        "",
        modelName2,
        attrs2,
        "",
        added.join("\n"),
        "",
        removed.join("\n")
      ];
      FS.writeFileSync("diff.txt", content.join("\n"));
    }
  } else {
    print();
    generateImage();
  }
}

function analyse(dirname: string) {
  console.log("Parsing sources");
  const paths = [
    Path.resolve(dirname, "./projects/boilerplate/addon/models"),
    Path.resolve(dirname, "./projects/boilerplate/app/models"),
    Path.resolve(dirname, "./projects/dashboard/app/models"),
    Path.resolve(dirname, "./projects/partners_wheely_com/app/models"),
    Path.resolve(dirname, "./projects/business_renovation/app/models")
  ];
  const gettingFileNames = new Promise(resolve => {
    const fileNames = [];
    let count = paths.length;
    paths.forEach(path => {
      parseDirectory(fileNames, path).then(() => {
        count--;
        if (count === 0) {
          resolve(fileNames);
        }
      });
    });
  });
  gettingFileNames.then((fileNames: string[]) => {
    const program = TS.createProgram(fileNames, {
      allowJs: true
    });
    const sourceFiles = program.getSourceFiles();
    sourceFiles.forEach(sourceFile => parseSourceFile(program, sourceFile));
    output();
  });
}

function fetchGit(): Promise<void> {
  const fetchOpts: Git.FetchOptions = {
    callbacks: {
      certificateCheck: function() {
        return 1;
      },
      credentials: function(GITLAB_URL, userName) {
        return Git.Cred.sshKeyFromAgent(userName);
      },
      transferProgress: function(info) {
        return console.log(info);
      }
    }
  };

  console.log("Clonning git@github.com:wheely/boilerplate.git");
  return Git.Clone.clone(
    "git@github.com:wheely/boilerplate.git",
    "./projects/boilerplate/",
    { fetchOpts }
  )
    .then(
      () => {
        console.log("Clonning git@github.com:wheely/partners_wheely_com.git");
        return Git.Clone.clone(
          "git@github.com:wheely/partners_wheely_com.git",
          "./projects/partners_wheely_com",
          { fetchOpts }
        );
      },
      err => {
        console.log(err);
      }
    )
    .then(
      () => {
        console.log("git@github.com:wheely/dashboard.git");
        return Git.Clone.clone(
          "git@github.com:wheely/dashboard.git",
          "./projects/dashboard/",
          { fetchOpts }
        );
      },
      err => {
        console.log(err);
      }
    )
    .then(
      () => {
        console.log("git@github.com:wheely/business_wheely_com.git");
        return Git.Clone.clone(
          "git@github.com:wheely/business_wheely_com.git",
          "./projects/business_renovation/",
          { fetchOpts, checkoutBranch: "epic/renovation" }
        );
      },
      err => {
        console.log(err);
      }
    )
    .then(
      () => {
        console.log("Clonning complete");
      },
      err => {
        console.log(err);
      }
    );
}

function main() {
  if (FS.existsSync(Path.resolve(__dirname, "./projects/"))) {
    analyse(__dirname);
  } else {
    fetchGit().then(() => {
      analyse(__dirname);
    });
  }
}

main();
