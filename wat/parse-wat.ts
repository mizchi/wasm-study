const TOKENS = ["\"", "(", ")"];
const SKIP = [" ", "\n"];
const RESERVED = [...TOKENS, ...SKIP]

enum Mode {
  char,
  string,
  comment
}

type Token = {
  raw: string;
  d: number;
  pos: [start: number, end: number]
};

function tokenize(input: string): Token[] {
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
          mode = Mode.char;
        }
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

enum SyntaxType {
  Program = 'Program',
  Paren = "Paren",
  Op = "Op",
  Literal = "Literal",
};

type OpNode = {
  t: SyntaxType.Op,
  op: string,
  pos: [start: number, end: number]
}

type ParenNode = {
  t: SyntaxType.Paren,
  children: Node[],
  depth: number;
  pos: [start: number, end: number],
  tpos: [start: number, end: number],
}

type Node = {
  t: SyntaxType.Program,
  children: ParenNode[],
  pos: [start: number, end: number],
  tpos: [start: number, end: number],
} | {
  t: SyntaxType.Literal,
  value: string,
  pos: [start: number, end: number]
}
  | OpNode
  | ParenNode
  ;

function print(tokens: Token[], cur: number = 0, depth: number = 0): string {
  let _lines: string[] = [];
  let _ltokens: Token[] = [];

  // const push_line = () => {
  //   if (_ltokens.length) {
  //     const first = _ltokens[0];
  //     const last = _ltokens[_ltokens.length - 1];
  //   }
  // }

  // const push_token = (token: Token) => {
  //   if (_ltokens.length) {
  //     _ltokens.push(token);
  //   }
  // }

  let out = '';

  let line = '';
  // let keepLine = false;
  // let parenOpen = false;

  const println = (word: string, d: number) => {
    if (word.length) {
      print(word, d);
    }
    if (line.length) {
      out += line + "\n";
      line = '';
    }
  }
  const print = (word: string, d: number) => {
    if (line.length === 0) {
      line = ' '.repeat(d * 2) + word;
    } else {
      let lastParen = line.at(-1) === "(";
      let pre = lastParen ? '' : ' ';
      line += pre + word;
    }
    // parenOpen = word === "(";
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // console.log(token.raw);
    if (token.raw === '(') {
      print(token.raw, token.d);
      continue;
    }
    if (token.raw === ')') {
      println('', token.d - 1);
      println(token.raw, token.d - 1);
      continue;
    }
    println(token.raw, token.d);
  }
  return out;
  // let stack = 0;
  // let node = 0;
  // for (let i = 0; i < tokens.length; i++) {
  //   const token = tokens[i];
  //   // S-Expression Block
  //   if (token.tok === '(') {
  //     stack++;
  //   }
  //   if (token.tok === ')') {
  //     stack--;
  //   }
  // }
  // return [[], 0];
}

const BLOCK_START_TOKENS = ["(", 'if', "block", "loop"];
const BLOCK_END_TOKENS = [")", "end"];

const MAX_WHOLE_LINE = 120;
const MAX_LINE = 50;

// function print_oneline(tokens: string[], depth: number): string {
//   const [first, ...rest] = tokens;
//   const initial = '  '.repeat(depth) + `(` + first;
//   return initial + rest.join(' ') + ')';
// }

// TODO: include prefered one-line
/* eg.
  (func (export $a)
    (export $b) (export $c)
  )
*/
function flatten_lines(lines: string[], depth: number): string {
  let prevIsParenOpen = false;
  return lines.reduce((acc, line) => {
    let out = '';
    if (['('].includes(line)) {
      out = '  '.repeat(depth) + "(" + line;
    }
    if ([')'].includes(line)) {
      return acc + (prevIsParenOpen ? '' : '\n') + '  '.repeat(depth) + ")";
    }

    if (prevIsParenOpen) {
      out = acc + line + '\n';
    } else {
      out = acc + '\n' + '  '.repeat(depth) + line;
    }

    prevIsParenOpen = line === '(';
    return out;
  }, '');
}


function parse(tokens: Token[]): Node {
  // let nid = 0;
  const _parse = (tokens: Token[], cur: number = 0, depth: number = 0): [nodes: Node[], cur: number] => {
    let nodes: Node[] = [];
    let i: number;
    for (i = cur; i < tokens.length; i++) {
      let raw = tokens[i].raw;
      // end with cursor
      if (raw === ')') {
        return [nodes, i];
      }
      if (raw === '(') {
        const [children, next] = _parse(tokens, i + 1, depth + 1);
        // const first = children.at(0)!.pos[0];
        // const last = children.at(-1)!.pos[1];
        nodes.push({
          t: SyntaxType.Paren,
          depth: depth,
          // first: children.at(0) as OpNode,
          children: children,
          // pos: [first, last],
          // tpos: [cur, next],
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

function format(input: string) {
  const tokens = tokenize(input);
  const root = parse(tokens);

  const _print = (node: Node, depth: number = 0, is_oneline = false): string => {
    const prefix = is_oneline ? '' : '  '.repeat(depth);
    switch (node.t) {
      case SyntaxType.Program: {
        return node.children.map(c => _print(c, 0, false)).join("");
      }
      // case NodeType.Block: {
      case SyntaxType.Op: {
        // console.log("print:op", node.op);
        return prefix + String(node.op);
      }
      case SyntaxType.Literal: {
        // console.log("print:literal", node.value);
        return prefix + String(node.value);
      }
      case SyntaxType.Paren: {
        const onelined = (
          `(`
          + node.children.map(c => _print(c, depth + 1, true)).join(" ")
          + ')'
        );
        // console.log('onelined', onelined, node.children.map(c => _print(c, depth + 1, true)));
        if (is_oneline) return onelined;
        // asLine
        // const prefix = '  '.repeat(depth);
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

const input = await Deno.readTextFile("./no-sexp.wat");
// const input = `(module
//   (memory $0 1)
//   (memory $0 1)
//   (memory $0 1)
//   (memory $0 1)
//   (memory $0 1)
//   (memory $0 1)
//   (memory $0 1)
//   (memory $0 1)
//   (memory $0 1)
//   (memory $0 1)

// )
// `

const tokens = tokenize(input);
// console.log('tokens', tokens);
// console.log('-----');
// console.log(print(tokens));
// console.log('-----');
console.log(format(input));

// console.log(JSON.stringify(parse(tokens), null, 2));
