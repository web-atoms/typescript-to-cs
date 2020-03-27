import { App } from "@web-atoms/core/dist/App";
import DISingleton from "@web-atoms/core/dist/di/DISingleton";
import { Inject } from "@web-atoms/core/dist/di/Inject";
import WebApp from "@web-atoms/core/dist/web/WebApp";
import * as ts from "typescript/lib/typescript";

declare var window: any;

type printerFX = (node: ts.Node | ts.NodeArray<ts.Node> | undefined) => string;

function visitorCTX<T extends ts.Node>(ctx: ts.TransformationContext, tf: printerFX) {
    const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
        let n = convert(node, tf);

        if (n) {
            if (Array.isArray(n)) {
                n = n.join("");
            }
            return ts.createIdentifier(n);
        }
        // if (n) {
        //     return n;
        // }
        return ts.visitEachChild(node, visitor, ctx);
    };
    return visitor;
}

export function transform<T extends ts.Node>(tf: printerFX): ts.TransformerFactory<T> {
    return (ctx: ts.TransformationContext): ts.Transformer<T> => {
        return (n: T) => ts.visitNode(n, visitorCTX<T>(ctx, tf));
    };
}

function typeName(n: ts.Node | undefined): string {
    if (!n) { return "void"; }
    switch (n.kind) {
        case ts.SyntaxKind.Identifier:
            return (n as ts.Identifier).text;
        case ts.SyntaxKind.StringKeyword: return "string";
        case ts.SyntaxKind.NumberKeyword: return "double";
        case ts.SyntaxKind.BooleanKeyword: return "bool";
        case ts.SyntaxKind.ObjectKeyword: return "object";
        case ts.SyntaxKind.TypeReference:
            return typeName((n as ts.TypeReferenceNode).typeName);
        case ts.SyntaxKind.TypeOperator:
            const to = n as ts.TypeOperatorNode;
            return typeName(to.type);
        case ts.SyntaxKind.ArrayType:
            const at = n as ts.ArrayTypeNode;
            return typeName(at.elementType) + "[]";
        case ts.SyntaxKind.FunctionType:
            const ft = n as ts.FunctionTypeNode;
            return `Func<${ft.parameters.map((p) => typeName(p.type))}, ${typeName(ft.type)}>`;
    }
    return "object";
}

function toUpperCase(n: ts.Identifier | ts.PrivateIdentifier | undefined): string | ts.Node {
    if (!n) { return ""; }
    return n.text[0].toUpperCase() + n.text.substring(1);
}

function genericTypes(n: ts.NodeArray<ts.TypeParameterDeclaration> | undefined): string {
    if (!n) { return ""; }
    return "<" + n.map((n1) => {
        const e = n1.name;
        if (e?.kind === ts.SyntaxKind.Identifier) {
            const ie = e as ts.Identifier;
            return ie.text;
        }
        return "";
    }).join(",") + ">";
}

function convert(n: ts.Node, tf: printerFX): string | string [] | undefined {

    function join(nodes: ts.NodeArray<ts.Node> | undefined, sep: string = ", "): string {
        if (!nodes) { return ""; }
        return nodes.map(tf).join(sep);
    }

    function literal(
        query: TemplateStringsArray,
        ... args: Array<ts.NodeArray<ts.Node> | string | ts.Node | undefined> ): string {
        const list: string[] = [];
        for (let index = 0; index < args.length; index++) {
            const element = args[index];
            const raw = query.raw[index];
            if (raw) {
                list.push(raw);
            }
            if (element === undefined) {
                // list.push("undefined");
            } else {
                if (Array.isArray(element)) {
                    for (const iterator of element) {
                        list.push(tf(iterator) ?? iterator);
                    }
                } else {
                    if (typeof element === "object") {
                        list.push(tf(element) ?? element);
                    } else {
                        list.push(element);
                    }
                }
            }
        }
        const last = query.raw[args.length];
        if (last) {
            list.push(last);
        }

        // lets flatten...

        return list.join("");
    }

    switch (n.kind) {
        case ts.SyntaxKind.VariableStatement:
            const vd = n as ts.VariableStatement;
            return vd.declarationList.declarations.map((d) =>
            d.initializer
            ? literal `var ${d.name} = ${d.initializer};`
            : literal`var ${d.name};`);

        case ts.SyntaxKind.FunctionDeclaration:
            const fd = n as ts.FunctionDeclaration;
            // tslint:disable-next-line: max-line-length
            return literal `public static ${typeName(fd.type)} ${toUpperCase(fd.name)}${genericTypes(fd.typeParameters)} (${join(fd.parameters)}) ${fd.body}`;

        case ts.SyntaxKind.PropertyAccessExpression:
            const pae = n as ts.PropertyAccessExpression;
            return literal `${pae.expression}.${toUpperCase(pae.name)}`;

        case ts.SyntaxKind.Parameter:
            const p = n as ts.ParameterDeclaration;
            return literal `${typeName(p.type)} ${p.name}`;
        case ts.SyntaxKind.BinaryExpression:
            const be = n as ts.BinaryExpression;
            if (be.operatorToken?.kind  === ts.SyntaxKind.EqualsEqualsEqualsToken) {
                return literal `${be.left} == ${be.right}`;
            }
            if (be.operatorToken?.kind  === ts.SyntaxKind.ExclamationEqualsEqualsToken) {
                return literal `${be.left} != ${be.right}`;
            }
            break;
        case ts.SyntaxKind.CallExpression:
            const ce = n as ts.CallExpression;
            if (ce.expression?.kind === ts.SyntaxKind.Identifier) {
                return literal `${toUpperCase(ce.expression as ts.Identifier)}(${join(ce.arguments)})`;
            }
            if (ce.arguments.length === 1) {
                if (ce.expression?.kind === ts.SyntaxKind.PropertyAccessExpression) {
                    const ppe = ce.expression as ts.PropertyAccessExpression;
                    if (ppe.name?.text === "charCodeAt") {
                        return literal `${ppe.expression}[${ce.arguments[0]}]`;
                    }
                }
            }
            break;
        case ts.SyntaxKind.ArrayLiteralExpression:
            const ale = n as ts.ArrayLiteralExpression;
            return literal `new [${ join(ale.elements) }]`;
    }
    return undefined;
}

@DISingleton()
export default class CompilerService {

    private initialized: boolean = false;

    @Inject
    private app: App;

    public async compileAsync(source: string): Promise<string> {

        if (!this.initialized) {
            this.initialized = true;
            const a = this.app as WebApp;
            // await a.installScript("@web-atoms/ts2cs/node_modules/typescript/lib/typescript.js");

            for (const key in window.ts) {
                if (window.ts.hasOwnProperty(key)) {
                    const element = window.ts[key];
                    (ts as any)[key] = element;
                }
            }

        }

        if (!source) {
            return "// empty !!";
        }

        const sf = ts.createSourceFile("input.ts", source, ts.ScriptTarget.Latest, undefined, ts.ScriptKind.TS);

        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

        function tx<T extends ts.Node>(n: T): string {
            return printer.printNode(
                ts.EmitHint.Unspecified,
                ts.transform(n, [transform(print)]).transformed[0], sf);
        }

        function print(n: ts.Node | ts.NodeArray<ts.Node> | undefined): string {
            if (!n) { return ""; }
            if (Array.isArray(n)) {
                return n.map((a) => tx(a)).join("");
            }
            return tx(n as ts.Node);
        }

        const cf = ts.transform(sf,
            [transform(print)]).transformed[0];
        if (!cf) {
            return "";
        }

        return printer.printNode(ts.EmitHint.Unspecified, cf, sf);
    }

}
