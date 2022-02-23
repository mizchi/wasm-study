import { parse, tokenize } from "./parser.ts";
import { Node, SyntaxType } from "./types.ts";

const MAX_WHOLE_LINE = 120;
const MAX_LINE = 50;

export function format(input: string) {
  const tokens = tokenize(input);
  const root = parse(tokens);
  const _print = (node: Node, depth: number = 0, is_oneline = false): string => {
    const prefix = is_oneline ? '' : '  '.repeat(depth);
    switch (node.t) {
      case SyntaxType.Program: {
        return node.children.map(c => _print(c, 0, false)).join("");
      }
      case SyntaxType.Op: {
        return prefix + String(node.op);
      }
      case SyntaxType.Literal: {
        return prefix + String(node.value);
      }
      case SyntaxType.Paren: {
        const onelined = (
          `(`
          + node.children.map(c => _print(c, depth + 1, true)).join(" ")
          + ')'
        );
        if (is_oneline) return onelined;
        let line_breaked =
          onelined.length >= MAX_LINE || (
            onelined.length + prefix.length > MAX_WHOLE_LINE
          );
        if (!line_breaked) return prefix + onelined;
        const [first, ...body] = node.children;
        let out = `${prefix}(${_print(first, 0, true)}\n`;
        for (const child of body) {
          const line = _print(child, depth + 1, false);
          out += `${line}\n`;
        }
        out += `${prefix})`;
        return out;
      }
      default: {
        // @ts-ignore
        throw new Error("unexpected node type: " + node.t);
      }
    }
  }

  return _print(root);
}


// console.log(JSON.stringify(parse(tokens), null, 2));
