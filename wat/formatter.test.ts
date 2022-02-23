import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import { format } from "./formatter.ts";

Deno.test('whitespace', () => {
  assertEquals(
    format(`(module)`),
    `(module)`
  );
  assertEquals(
    format(`(module  )`),
    `(module)`,
    "should ignore space"
  );
});

Deno.test("break lines", () => {
  assertEquals(
    format(`(module (func $f (return i32) (i32.const 1)  ) )`),
    `(module (func $f (return i32) (i32.const 1)))`
  );

  assertEquals(
    format(
      `(module (func $f (return i32) (i32.const 1)  ) (func $g (return i32) (i32.const 1)  ) )`
    ),
    `(module
  (func $f (return i32) (i32.const 1))
  (func $g (return i32) (i32.const 1))
)`
  );
});

// Deno.test('keep whitespace', () => {
//   assertEquals(
//     format(`(module\n)`),
//     `(module\n)`,
//     "should keep empty line"
//   );
// });
