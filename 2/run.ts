const binary = Deno.readFileSync("./run.wasm");

const memory = new WebAssembly.Memory({ initial: 1 });

const str_ptr = 1;

function decodeStr(
  memory: WebAssembly.Memory,
  ptr: number,
  len: number,
): string {
  const bytes = new Uint8Array(memory.buffer, ptr, len);
  return new TextDecoder("utf-8").decode(bytes);
}

const importObject: WebAssembly.Imports = {
  env: {
    buffer: memory,
    string_ptr: str_ptr,
    print_string(ptr: number, len: number) {
      const x = decodeStr(memory, ptr, len);
      console.log(x);
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
const x = exports.helloworld();
console.log(x);

import { assert } from "https://deno.land/std@0.122.0/testing/asserts.ts";
Deno.test("addInt", () => {
  assert(exports.addInt(1, 2) === 3);
});

Deno.test("sumSquared", () => {
  assert(exports.sumSquared(1, 2) === 9);
});
