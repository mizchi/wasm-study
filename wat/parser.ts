import { Node, ParenNode, SyntaxType, Token } from "./types.ts";

const TOKENS = ["\"", "(", ")"];
const SKIP = [" ", "\n"];
const RESERVED = [...TOKENS, ...SKIP]

enum Mode {
  char,
  string,
  comment
}

export function tokenize(input: string): Token[] {
  const chars = Array.from(input);
  const size = chars.length;
  // state
  let mode = Mode.char as Mode;
  const tokens: Array<Token> = [];
  let _buf: string[] = [];
  let start = 0;
  let end = 0;
  let stack = 0;

  const eat = () => {
    if (_buf.length > 0) {
      tokens.push({ raw: _buf.join(""), d: stack, pos: [start, end] });
      _buf.length = 0;
    }
  }
  const push_single_token = (char: string, idx: number) => {
    if (_buf.length) throw new Error("queue is not empty");
    tokens.push({ raw: char, d: stack, pos: [idx, idx + char.length] });
  }

  const push_char = (char: string, idx: number) => {
    if (_buf.length === 0) {
      start = idx;
    } else {
      end = idx;
    }
    _buf.push(char);
  }

  for (let cur = 0; cur < size; cur++) {
    const char = chars[cur];
    switch (mode) {
      case Mode.comment: {
        if (chars[cur - 1] !== '\\' && char === '\n') {
          eat();
          mode = Mode.char;
          continue;
        }
        push_char(char, cur);
        continue;
      }
      case Mode.string: {
        if (chars[cur - 1] !== '\\' && char === '"') {
          mode = Mode.char;
          push_char(char, cur);
          eat();
          continue;
        } else {
          push_char(char, cur);
        }
        continue;
      }
      case Mode.char: {
        // enter comment mode
        if (char === ';' && chars[cur + 1] === ';') {
          push_char(char, cur);
          mode = Mode.comment;
          continue;
        }
        // enter string mode
        if (char === '"') {
          eat();
          push_char(char, cur);
          mode = Mode.string;
          continue;
        }
        if (SKIP.includes(char)) {
          eat();
          continue;
        }
        if (RESERVED.includes(char)) {
          eat();
          push_single_token(char, cur);
          if (char === "(") {
            stack++;
          }
          if (char === ")") {
            stack--;
          }
          continue;
        }
        push_char(char, cur);
        continue;
      }
    }
  }
  return tokens;
}

const MAX_WHOLE_LINE = 120;
const MAX_LINE = 50;

export function parse(tokens: Token[]): Node {
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
        nodes.push({
          t: SyntaxType.Paren,
          depth: depth,
          children: children,
        } as any);
        // skip to next
        i = next;
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
  }
  const [rootNodes, end] = _parse(tokens, 0, 0);

  return {
    t: SyntaxType.Program,
    children: rootNodes as ParenNode[],
    pos: [0, tokens.at(-1)!.pos[1]],
    tpos: [0, end],
  }
}
