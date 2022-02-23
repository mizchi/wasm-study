import { Node, ParenNode, Program, SyntaxType, Token, WhitespaceNode } from "./types.ts";

export function parse(tokens: Token[]): Program {
  // let nid = 0;
  const _parse = (tokens: Token[], cur: number = 0, depth: number = 0): [nodes: Node[], cur: number] => {
    let nodes: Node[] = [];
    let i: number;
    for (i = cur; i < tokens.length; i++) {
      let raw = tokens[i].raw;
      // end with cursor
      if (raw === ')') {
        // do not eat
        return [nodes, i];
      }
      if (raw === '(') {
        const [children, next] = _parse(tokens, i + 1, depth + 1);
        const start = children.at(0)!;
        const end = children.at(-1)!;
        nodes.push({
          t: SyntaxType.Paren,
          depth: depth,
          children: children,
          pos: [start.pos[0], end.pos[1]],
          tpos: [i + 1, next],
        });
        // skip to next
        i = next;
        continue;
      }
      if (tokens[i].t) {
        switch (tokens[i].t) {
          case SyntaxType.WhiteSpace: {
            nodes.push({
              t: SyntaxType.WhiteSpace,
              raw: raw,
              pos: tokens[i].pos,
            });
            break;
          }
          case SyntaxType.NewLine: {
            nodes.push({
              t: SyntaxType.NewLine,
              raw: raw,
              pos: tokens[i].pos,
            });
            break;
          }
        }
        continue;
      }
      const isNum = /^\d+$/.test(raw);
      const isStr = /^\"/.test(raw);
      const isSymbol = /^\$/.test(raw);
      const isOp = !(isNum || isStr || isSymbol);
      if (isOp) {
        nodes.push({ t: SyntaxType.Op, op: raw, pos: tokens[i].pos });
      } else {
        nodes.push({
          t: SyntaxType.Literal,
          value: raw,
          pos: tokens[i].pos,
        });
      }
    }
    return [nodes, i];
    // }
  }
  const [rootNodes, end] = _parse(tokens, 0, 0);
  return {
    t: SyntaxType.Program,
    children: rootNodes as ParenNode[],
    pos: [0, tokens.at(-1)!.pos[1]],
    tpos: [0, end],
  } as Program;
}