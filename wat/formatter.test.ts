import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';
import { format } from "./formatter.ts";

Deno.test('whitespace', () => {
  // assertEquals(
  //   format(`(module)`),
  //   `(module)`
  // );
  // console.log(`------\n${format(`(module (memory $0 1))`)}`);
  // console.log(`------\n${format(`(module )`)}`);

  assertEquals(
    format(`(module )`),
    `(module)`,
  );
  assertEquals(
    format(`(module  )`),
    `(module)`,
  );
  // console.log(format("(module \n)"));
  assertEquals(
    format(`(module\n)`),
    `(module\n)`,
  );
  assertEquals(
    format(`(module\n\n)`),
    `(module\n)`,
  );
  assertEquals(
    format(`(module\n\n)`),
    `(module\n)`,
  );

  assertEquals(
    format(`(module\n\n\n)`),
    `(module\n)`,
  );
  assertEquals(
    format(`(module
  (memory 0))`),
    `(module
  (memory 0)
)`,
  );
  assertEquals(
    format(`(module
  (memory 0)

    )`),
    `(module
  (memory 0)

)`,
  );
  assertEquals(
    format(`(module
  (memory 0)


)`),
    `(module
  (memory 0)

)`,
  );
  assertEquals(
    format(`(module
  (memory 0)

  (memory 0)

)`),
    `(module
  (memory 0)

  (memory 0)

)`,
  );

  //   assertEquals(
  //     format(`(module
  //   (memory 0)
  // )`),
  //     `(module
  //   (memory 0)

  // )`,
  //   );
  //   assertEquals(
  //     format(`(module
  //   (memory 0)


  // )`),
  //     `(module
  //   (memory 0)
  // )`,
  // );

});


// Deno.test("break lines", () => {
//   assertEquals(
//     format(`(module (func $f (return i32) (i32.const 1)  ) )`),
//     `(module (func $f (return i32) (i32.const 1)))`
//   );

//   assertEquals(
//     format(
//       `(module (func $f (return i32) (i32.const 1)  ) (func $g (return i32) (i32.const 1)  ) )`
//     ),
//     `(module
//   (func $f (return i32) (i32.const 1))
//   (func $g (return i32) (i32.const 1))
// )`
//   );
// });

// Deno.test('keep whitespace', () => {
//   assertEquals(
//     format(`(module\n)`),
//     `(module\n)`,
//     "should keep empty line"
//   );
// });
