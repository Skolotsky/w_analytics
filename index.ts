import * as FS from "fs";
import * as Path from "path";
import * as TS from "typescript";
import * as CC from "change-case";

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
) {
  const checker = program.getTypeChecker();
  const symbol = checker.getSymbolAtLocation(identifier);
  if (symbol.declarations && symbol.declarations[0]) {
    let declaration = symbol.declarations[0];
    if (TS.isBindingElement(declaration)) {
      let parent:
        | TS.VariableDeclaration
        | TS.ParameterDeclaration
        | TS.BindingElement = declaration;
      let names = [];
      while (TS.isBindingElement(parent)) {
        if (parent.propertyName && TS.isIdentifier(parent.propertyName)) {
          names.push(parent.propertyName.text);
        } else if (TS.isIdentifier(parent.name)) {
          names.push(parent.name.text);
        }
        if (TS.isObjectBindingPattern(parent.parent)) {
          parent = parent.parent.parent;
        }
      }
      if (TS.isVariableDeclaration(parent)) {
        return getFullNameByExpression(
          program,
          parent.initializer,
          names.join(MEMBER_DELIMETER)
        );
      }
    }
    if (TS.isImportSpecifier(declaration)) {
      declaration = declaration.parent.parent;
    }
    if (TS.isImportClause(declaration)) {
      if (TS.isImportDeclaration(declaration.parent)) {
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
) {
  let fullName = "";
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
    fullNames.push(classFullName);
  }
}

const projectInfoMap = new Map<string, Object>();
function getProjectInfo(projectPath: string) {
  if (projectInfoMap.has(projectPath)) {
    return projectInfoMap.get(projectPath);
  }
  const projectInfo = JSON.parse(
    FS.readFileSync(projectPath + Path.sep + "package.json").toString()
  );
  projectInfoMap.set(projectPath, projectInfo);
  return projectInfo;
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
    const projectInfo = getProjectInfo(projectPath);
    let projectName = projectInfo["name"] || "";
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
    case TS.SyntaxKind.ExportAssignment:
      const exportAssignment = node as TS.ExportAssignment;
      switch (exportAssignment.expression.kind) {
        case TS.SyntaxKind.CallExpression:
          const callExpression = exportAssignment.expression as TS.CallExpression;
          if (isCallExpressionIsExtending(callExpression)) {
            const baseClassFullName = getBaseClassFullNameFromCallExpression(
              program,
              callExpression
            );
            const classFullName = getModuleName(sourceFile.fileName);
            const mixins = [];
            const attributes = [];
            const relationships = [];
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
                          const typeArgument =
                            property.initializer.arguments[0];
                          let type: string = "attr";
                          if (
                            typeArgument &&
                            TS.isStringLiteral(typeArgument)
                          ) {
                            type = type + ".<" + typeArgument.text + ">";
                          }
                          attributes.push([propertyName, type]);
                          break;
                        }
                        case "ember-data~hasMany": {
                          const typeArgument =
                            property.initializer.arguments[0];
                          let modelName = CC.paramCase(propertyName);
                          if (
                            typeArgument &&
                            TS.isStringLiteral(typeArgument)
                          ) {
                            modelName = typeArgument.text;
                          }
                          relationships.push([
                            propertyName,
                            { type: "hasMany", modelName: modelName }
                          ]);
                          break;
                        }
                        case "ember-data~belongsTo": {
                          const typeArgument =
                            property.initializer.arguments[0];
                          let modelName = CC.paramCase(propertyName);
                          if (
                            typeArgument &&
                            TS.isStringLiteral(typeArgument)
                          ) {
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
                const moxinFullName = getFullNameByExpression(
                  program,
                  argument
                );
                mixins.push(moxinFullName);
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
      }
      break;
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

function getClassDefinitionString(classDefinition: IClassDefinition) {
  const attributesString = classDefinition.attributes
    .map(([name, type]) => `${name} : ${type}`)
    .join("\n");
  return `\nclass "${classDefinition.classFullName}" {\n${attributesString}\n}`;
}

function main() {
  const paths = [
    Path.resolve(process.env.HOME, "./projects/boilerplate/addon/models"),
    Path.resolve(process.env.HOME, "./projects/boilerplate/app/models"),
    Path.resolve(process.env.HOME, "./projects/dashboard/app/models"),
    Path.resolve(process.env.HOME, "./projects/partners_wheely_com/app/models"),
    Path.resolve(process.env.HOME, "./projects/business_renovation/app/models")
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

    const classesToPrint = new Set<string>();
    const relationsStrings = [];
    classDefinitionMap.forEach((classDefinition, classFullName) => {
      if (classDefinition.baseClassFullName !== "ember-data~Model") {
        const baseClassFullName = classDefinition.baseClassFullName;
        classesToPrint.add(classFullName);
        classesToPrint.add(baseClassFullName);
        relationsStrings.push(`\n"${baseClassFullName}" <|-- "${classFullName}"`);
      }
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
                `\n"${classFullName}" o-- "1" "${modelFullName}" : ${propertyName}`
              );
            } else {
              relationsStrings.push(
                `\n"${classFullName}" : ${modelName} : ${propertyName}`
              );
            }
          } else {
            if (modelFullName) {
              relationsStrings.push(
                `\n"${classFullName}" o-- "*" "${modelFullName}" : ${propertyName}`
              );
            } else {
              relationsStrings.push(
                `\n"${classFullName}" : ${modelName}[] : ${propertyName}`
              );
            }
          }
        }
      );
    });
    FS.writeFileSync("classes.puml", "@startuml");
    classesToPrint.forEach(classFullName => {
      const projectName = classFullName.split("/")[0];
      FS.appendFileSync(
        "classes.puml",
        `\npackage "${projectName}" {\n  class "${classFullName}"\n}`
      );
      if (classDefinitionMap.has(classFullName)) {
        const classDefinition = classDefinitionMap.get(classFullName);

        FS.appendFileSync(
          "classes.puml",
          getClassDefinitionString(classDefinition)
        );
      }
    });

    FS.appendFileSync(
      "classes.puml",
      relationsStrings.join('')
    );
    FS.appendFileSync("classes.puml", "\n@enduml");
  });
}

main();
