import { SyntaxType, Token } from "./types.ts";

const TOKENS = ["\"", "(", ")"];
const WHITE_SPACES = [" ", "\t"];
const NEW_LINES = ["\n"];

const RESERVED = [...TOKENS];

enum Mode {
  char,
  string,
  comment,
  // ws,
}

type TokenizeOptions = { whitespace: boolean };
const defaults = { whitespace: true };
export function tokenize(input: string, { whitespace }: TokenizeOptions = defaults): Token[] {
  const chars = Array.from(input);
  const size = chars.length;
  // state
  let mode = Mode.char as Mode;
  const tokens: Array<Token> = [];
  let _buf: string[] = [];
  let start = 0;
  // let end = 0;
  let stack = 0;

  const eat = (t?: SyntaxType) => {
    if (_buf.length > 0) {
      const tok = _buf.join("");
      let nt = { raw: tok, d: stack, pos: [start, start + tok.length] } as Token;
      if (t) nt.t = t;
      // if (nt.raw === "module ") {
      //   throw new Error(`Unexpected: '${nt.raw}'`);
      // }
      // console.log("eat", nt);
      tokens.push(nt);
      _buf.length = 0;
    }
  }
  const push_single_token = (char: string, idx: number) => {
    if (_buf.length) throw new Error("queue is not empty");
    tokens.push({
      raw: char,
      d: stack,
      pos: [
        idx, idx + char.length
      ]
    });
  }

  const push_char = (char: string, idx: number) => {
    if (_buf.length === 0) {
      start = idx;
    }
    _buf.push(char);
  }

  for (let cur = 0; cur < size; cur++) {
    const prev_char = chars[cur - 1];
    const char = chars[cur];
    const next_char = chars[cur + 1];
    switch (mode) {
      case Mode.comment: {
        if (chars[cur - 1] !== '\\' && NEW_LINES.includes(char)) {
          eat(SyntaxType.LineComment);
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
          eat(SyntaxType.Literal);
          continue;
        } else {
          push_char(char, cur);
        }
        continue;
      }
      case Mode.char: {
        if (NEW_LINES.includes(char)) {
          eat();
          push_char(char, cur);
          eat(SyntaxType.NewLine);
          mode = Mode.char;
          continue;
        }
        // enter whitespace
        if (WHITE_SPACES.includes(char)) {
          // if previous is not whitespace, eat it
          if (!WHITE_SPACES.includes(prev_char)) {
            eat();
          }
          // eat it
          push_char(char, cur);
          if (!WHITE_SPACES.includes(next_char)) {
            eat(SyntaxType.WhiteSpace);
          }
          continue;
        }

        // enter comment mode
        if (char === ';' && next_char === ';') {
          eat();
          mode = Mode.comment;
          push_char(char, cur);
          continue;
        }
        // enter string mode
        if (char === '"') {
          eat();
          push_char(char, cur);
          mode = Mode.string;
          continue;
        }
        if (RESERVED.includes(char as any)) {
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
  eat();
  return tokens;
}
