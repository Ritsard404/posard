import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";

const protectedRoot = path.join(process.cwd(), "app", "(protected)");
const onboardingRoot = path.join(process.cwd(), "app", "(onboarding)");
const proxyPath = path.join(process.cwd(), "proxy.ts");

function hasPageFile(routeDir: string) {
  return fs.existsSync(path.join(routeDir, "page.tsx"));
}

function getProtectedTopLevelRoutes() {
  const protectedRoutes = fs
    .readdirSync(protectedRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("_"))
    .filter((entry) => hasPageFile(path.join(protectedRoot, entry.name)))
    .map((entry) => entry.name);

  const onboardingRoutes = fs
    .readdirSync(onboardingRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => hasPageFile(path.join(onboardingRoot, entry.name)))
    .map((entry) => entry.name);

  return [...protectedRoutes, ...onboardingRoutes, "notifications"].sort();
}

function getProxyMatchers() {
  const source = fs.readFileSync(proxyPath, "utf8");
  const sourceFile = ts.createSourceFile(
    proxyPath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const matchers: string[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "config" &&
          declaration.initializer &&
          ts.isObjectLiteralExpression(declaration.initializer)
        ) {
          const matcherProperty = declaration.initializer.properties.find(
            (property): property is ts.PropertyAssignment =>
              ts.isPropertyAssignment(property) &&
              ts.isIdentifier(property.name) &&
              property.name.text === "matcher" &&
              ts.isArrayLiteralExpression(property.initializer),
          );

          if (!matcherProperty || !ts.isArrayLiteralExpression(matcherProperty.initializer)) {
            continue;
          }

          for (const element of matcherProperty.initializer.elements) {
            if (ts.isStringLiteral(element)) {
              matchers.push(element.text);
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return matchers;
}

test("proxy matcher covers every protected top-level route", () => {
  const routes = getProtectedTopLevelRoutes();
  const matchers = new Set(getProxyMatchers());
  const missing = routes
    .map((route) => `/${route}/:path*`)
    .filter((matcher) => !matchers.has(matcher));

  assert.deepEqual(missing, []);
});
