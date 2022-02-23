// import { SyntaxType } from './types';
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { tokenize } from "./tokenizer.ts";
import { SyntaxType } from "./types.ts";

Deno.test('keep ws', () => {
  const tokens = tokenize(` (module)`, {
    whitespace: true,
  });
  // console.log('ws', tokens);
  assertEquals(tokens[0],
    {
      d: 0,
      pos: [
        0,
        1,
      ],
      raw: " ",
      t: SyntaxType.WhiteSpace,
    },
  );
  assertEquals(tokens[1],
    {
      d: 0,
      pos: [
        1,
        2,
      ],
      raw: "(",
    },
  );
});

Deno.test('tokenize', () => {
  const input = `(module)`;
  const tokens = tokenize(`(module)`);
  assertEquals(tokens,
    [
      {
        d: 0,
        pos: [
          0,
          1,
        ],
        raw: "(",
      },
      {
        d: 1,
        pos: [
          1,
          7,
        ],
        raw: "module",
      },
      {
        d: 1,
        pos: [
          7,
          8,
        ],
        raw: ")",
      },
    ]
  );
  assertEquals(input.slice(...tokens[0].pos), '(');
  assertEquals(input.slice(...tokens[1].pos), 'module');
  assertEquals(input.slice(...tokens[2].pos), ')');
});

Deno.test('keep ws', () => {
  const tokens = tokenize(`(module )`, {
    whitespace: true,
  });
  console.log('ws', tokens);
  assertEquals(tokens,
    [
      {
        d: 0,
        pos: [
          0,
          1,
        ],
        raw: "(",
      },
      {
        d: 1,
        pos: [
          1,
          7,
        ],
        raw: "module",
      },
      {
        d: 1,
        pos: [
          7,
          8,
        ],
        raw: " ",
        t: SyntaxType.WhiteSpace,
      },
      {
        d: 1,
        pos: [
          8,
          9,
        ],
        raw: ")",
      },
    ]
  );
});


Deno.test('keep ws', () => {
  const tokens = tokenize(`(module  )`, {
    whitespace: true,
  });
  assertEquals(tokens,
    [
      {
        d: 0,
        pos: [
          0,
          1,
        ],
        raw: "(",
      },
      {
        d: 1,
        pos: [
          1,
          7,
        ],
        raw: "module",
      },
      {
        d: 1,
        pos: [
          7,
          9,
        ],
        raw: "  ",
        t: SyntaxType.WhiteSpace,
      },
      {
        d: 1,
        pos: [
          9,
          10,
        ],
        raw: ")",
      },
    ]
  );
});


Deno.test('parse newline', () => {
  const tokens = tokenize(`(module\n)`, {
    whitespace: true,
  });
  assertEquals(tokens,
    [
      {
        d: 0,
        pos: [
          0,
          1,
        ],
        raw: "(",
      },
      {
        d: 1,
        pos: [
          1,
          7,
        ],
        raw: "module",
      },
      {
        d: 1,
        pos: [
          7,
          8,
        ],
        raw: "\n",
        t: SyntaxType.NewLine,
      },
      {
        d: 1,
        pos: [
          8,
          9,
        ],
        raw: ")",
      },
    ]
  );
});