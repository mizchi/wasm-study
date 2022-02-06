const binary = Deno.readFileSync("./run.wasm");

const memory = new WebAssembly.Memory({ initial: 1 });

const start_string_index = 100;

const importObject: WebAssembly.Imports = {
  env: {
    buffer: memory,
    start_string: start_string_index,
    print_string(str_len: number) {
      const bytes = new Uint8Array(memory.buffer, start_string_index, str_len);
      const text = new TextDecoder("utf-8").decode(bytes);
      console.log(
        "xxx",
        Array.from(bytes).map((c) => String.fromCharCode(c)),
      );

      console.log(text);
    },
  },
};

const ret = await WebAssembly.instantiate(binary, importObject);
const exports = ret.instance.exports as {
  helloworld(): void;
  addInt(a: number, b: number): number;
  sumSquared(a: number, b: number): number;
};
// console.log(
exports.helloworld();

import { assert } from "https://deno.land/std@0.122.0/testing/asserts.ts";
Deno.test("addInt", () => {
  assert(exports.addInt(1, 2) === 3);
});

Deno.test("sumSquared", () => {
  assert(exports.sumSquared(1, 2) === 9);
});
