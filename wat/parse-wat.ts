// const TOKENS = ["\"", "(", ")"];
// const SKIP = [" ", "\n"];
// const RESERVED = [...TOKENS, ...SKIP]

// enum Mode {
//   char,
//   string,
//   comment
// }

// type Token = {
//   raw: string;
//   d: number;
//   pos: [start: number, end: number]
// };

// function tokenize(input: string): Token[] {
//   const chars = Array.from(input);
//   const size = chars.length;
//   // state
//   let mode = Mode.char as Mode;
//   const tokens: Array<Token> = [];
//   let _buf: string[] = [];
//   let start = 0;
//   let end = 0;
//   let stack = 0;

//   const eat = () => {
//     if (_buf.length > 0) {
//       tokens.push({ raw: _buf.join(""), d: stack, pos: [start, end] });
//       _buf.length = 0;
//     }
//   }
//   const push_single_token = (char: string, idx: number) => {
//     if (_buf.length) throw new Error("queue is not empty");
//     tokens.push({ raw: char, d: stack, pos: [idx, idx + char.length] });
//   }

//   const push_char = (char: string, idx: number) => {
//     if (_buf.length === 0) {
//       start = idx;
//     } else {
//       end = idx;
//     }
//     _buf.push(char);
//   }

//   for (let cur = 0; cur < size; cur++) {
//     const char = chars[cur];
//     switch (mode) {
//       case Mode.comment: {
//         if (chars[cur - 1] !== '\\' && char === '\n') {
//           eat();
//           mode = Mode.char;
//           continue;
//         }
//         push_char(char, cur);
//         continue;
//       }
//       case Mode.string: {
//         if (chars[cur - 1] !== '\\' && char === '"') {
//           mode = Mode.char;
//           push_char(char, cur);
//           eat();
//           continue;
//         } else {
//           push_char(char, cur);
//         }
//         continue;
//       }
//       case Mode.char: {
//         // enter comment mode
//         if (char === ';' && chars[cur + 1] === ';') {
//           push_char(char, cur);
//           mode = Mode.comment;
//           continue;
//         }
//         // enter string mode
//         if (char === '"') {
//           eat();
//           push_char(char, cur);
//           mode = Mode.string;
//           continue;
//         }
//         if (SKIP.includes(char)) {
//           eat();
//           continue;
//         }
//         if (RESERVED.includes(char)) {
//           eat();
//           push_single_token(char, cur);
//           if (char === "(") {
//             stack++;
//           }
//           if (char === ")") {
//             stack--;
//           }
//           continue;
//         }
//         push_char(char, cur);
//         continue;
//       }
//     }
//   }
//   return tokens;
// }

// enum SyntaxType {
//   LineComment = "LineComment",
//   Program = 'Program',
//   Paren = "Paren",
//   Op = "Op",
//   Literal = "Literal",
// };

// type OpNode = {
//   t: SyntaxType.Op,
//   op: string,
//   pos: [start: number, end: number]
// }

// type ParenNode = {
//   t: SyntaxType.Paren,
//   children: Node[],
//   depth: number;
//   pos: [start: number, end: number],
//   tpos: [start: number, end: number],
// }

// type LineCommentNode = {
//   t: SyntaxType.LineComment,
//   depth: number;
//   pos: [start: number, end: number],
//   tpos: [start: number, end: number],
// }

// type Node = {
//   t: SyntaxType.Program,
//   children: ParenNode[],
//   pos: [start: number, end: number],
//   tpos: [start: number, end: number],
// } | {
//   t: SyntaxType.Literal,
//   value: string,
//   pos: [start: number, end: number]
// }
//   | OpNode
//   | ParenNode
//   | LineCommentNode
//   ;

// const BLOCK_START_TOKENS = ["(", 'if', "block", "loop"];
// const BLOCK_END_TOKENS = [")", "end"];

// const MAX_WHOLE_LINE = 120;
// const MAX_LINE = 50;

// function parse(tokens: Token[]): Node {
//   // let nid = 0;
//   const _parse = (tokens: Token[], cur: number = 0, depth: number = 0): [nodes: Node[], cur: number] => {
//     let nodes: Node[] = [];
//     let i: number;
//     for (i = cur; i < tokens.length; i++) {
//       let raw = tokens[i].raw;
//       // end with cursor
//       if (raw === ')') {
//         // do not eat
//         return [nodes, i];
//       }
//       if (raw === '(') {
//         const [children, next] = _parse(tokens, i + 1, depth + 1);
//         nodes.push({
//           t: SyntaxType.Paren,
//           depth: depth,
//           children: children,
//         } as any);
//         // skip to next
//         i = next;
//         continue;
//       }
//       const isNum = /^\d+$/.test(raw);
//       const isStr = /^\"/.test(raw);
//       const isSymbol = /^\$/.test(raw);
//       const isOp = !(isNum || isStr || isSymbol);
//       if (isOp) {
//         nodes.push({ t: SyntaxType.Op, op: raw, pos: tokens[i].pos });
//       } else {
//         nodes.push({
//           t: SyntaxType.Literal,
//           value: raw,
//           pos: tokens[i].pos,
//         });
//       }
//     }
//     return [nodes, i];
//   }
//   const [rootNodes, end] = _parse(tokens, 0, 0);

//   return {
//     t: SyntaxType.Program,
//     children: rootNodes as ParenNode[],
//     pos: [0, tokens.at(-1)!.pos[1]],
//     tpos: [0, end],
//   }
// }

// function format(input: string) {
//   const tokens = tokenize(input);
//   const root = parse(tokens);
//   const _print = (node: Node, depth: number = 0, is_oneline = false): string => {
//     const prefix = is_oneline ? '' : '  '.repeat(depth);
//     switch (node.t) {
//       case SyntaxType.Program: {
//         return node.children.map(c => _print(c, 0, false)).join("");
//       }
//       case SyntaxType.Op: {
//         return prefix + String(node.op);
//       }
//       case SyntaxType.Literal: {
//         return prefix + String(node.value);
//       }
//       case SyntaxType.Paren: {
//         const onelined = (
//           `(`
//           + node.children.map(c => _print(c, depth + 1, true)).join(" ")
//           + ')'
//         );
//         if (is_oneline) return onelined;
//         let line_breaked =
//           onelined.length >= MAX_LINE || (
//             onelined.length + prefix.length > MAX_WHOLE_LINE
//           );
//         if (!line_breaked) return prefix + onelined;
//         const [first, ...body] = node.children;
//         let out = `${prefix}(${_print(first, 0, true)}\n`;
//         for (const child of body) {
//           const line = _print(child, depth + 1, false);
//           out += `${line}\n`;
//         }
//         out += `${prefix})`;
//         return out;
//       }
//       default: {
//         // @ts-ignore
//         throw new Error("unexpected node type: " + node.t);
//       }
//     }
//   }

//   return _print(root);
// }

// const input = await Deno.readTextFile("./no-sexp.wat");
// // const input = `(module
// //   (memory $0 1)
// // )`;

// const tokens = tokenize(input);
// console.log(format(input));

// // console.log(JSON.stringify(parse(tokens), null, 2));
