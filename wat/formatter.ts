import { parse } from "./parser.ts";
import { tokenize } from "./tokenizer.ts";
import { Node, SyntaxType } from "./types.ts";

const MAX_WHOLE_LINE = 120;
const MAX_LINE = 50;

const filter_children = (children: Node[], is_oneline: boolean): Node[] => {
  // return children;
  let nl_count = 0;
  return children
    .filter((child) => {
      if (is_oneline) {
        return ![SyntaxType.WhiteSpace, SyntaxType.NewLine].includes(child.t);
      } else {
        return ![SyntaxType.WhiteSpace].includes(child.t);
      }
    })
    .reduce((acc, item) => {
      if (item.t === SyntaxType.NewLine) {
        nl_count++;
        if (nl_count > 2) {
          return acc;
        }
      } else {
        nl_count = 0;
      }
      return [...acc, item];
    }, [] as Node[]);
}

export function format(input: string) {
  const tokens = tokenize(input);
  // console.log(tokens);
  const root = parse(tokens);
  const _print = (node: Node, depth: number = 0, is_oneline = false): string => {
    const prefix = is_oneline ? '' : '  '.repeat(depth);
    switch (node.t) {
      case SyntaxType.Program: {
        return node.children.map(c => _print(c, 0, false)).join("");
      }
      case SyntaxType.WhiteSpace: {
        // if (!is_oneline)
        throw new Error(`print ws: only allow oneline`);
        // return ' ';
      }
      case SyntaxType.NewLine: {
        // if (!is_oneline) throw new Error(`print ws: only allow oneline`);
        return '\n';
      }
      case SyntaxType.LineComment: {
        return prefix + String(node.raw);
      }
      case SyntaxType.Op: {
        return prefix + String(node.op);
      }
      case SyntaxType.Literal: {
        return prefix + String(node.value);
      }
      case SyntaxType.Paren: {
        // const nodes = filter_children(node.children, true);
        let includeNewLine = false;
        const nodes = node.children.filter(c => {
          if (c.t === SyntaxType.NewLine) {
            includeNewLine = true;
          }
          return ![SyntaxType.WhiteSpace, SyntaxType.NewLine].includes(c.t);
        });
        // console.log("paren: filtered nodes", nodes);
        const onelined = (
          `(`
          + nodes.map(c => _print(c, depth + 1, true)).join(" ")
          + ')'
        );
        // console.log("onelined:", onelined);
        if (is_oneline) return onelined;
        let line_breaked =
          includeNewLine
          || onelined.length >= MAX_LINE
          || (
            onelined.length + prefix.length > MAX_WHOLE_LINE
          );
        if (!line_breaked) return prefix + onelined;
        // include newline and comments
        const [first, ...rest] = node.children.filter(c => ![SyntaxType.WhiteSpace].includes(c.t));
        const first_idx = rest.findIndex(c => ![SyntaxType.NewLine].includes(c.t));
        const body = rest.slice(first_idx);

        let out = `${prefix}(${_print(first, 0, true)}\n`;

        // let nl_count = 1;
        // let is_first_body = true;
        let next_blank_line_allowed = true;
        for (let i = 0; i < body.length; i++) {
          const child = body[i];
          if (child.t === SyntaxType.NewLine && (i === 0 || i === body.length - 1)) {
            // skip first and last new line;
            continue;
          }
          // if (child.t === SyntaxType.NewLine) {

          // }

          if (child.t === SyntaxType.NewLine) {
            if (next_blank_line_allowed) {
              out += '\n';
              next_blank_line_allowed = false;
            }
            continue;
          } else {
            out += _print(child, depth + 1, false) + '\n';
            next_blank_line_allowed = true;
          }
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
