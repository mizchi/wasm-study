import {
  assert,
  equal,
} from "https://deno.land/std@0.122.0/testing/asserts.ts";

// Constants

const MAGIC_MODULE_HEADER = [0x00, 0x61, 0x73, 0x6d];
const MODULE_VERSION = [0x01, 0x00, 0x00, 0x00];

const functionType = 0x60;
const emptyArray = 0x0;

enum Op {
  end = 0x0b,
  local_get = 0x20,
  f32_add = 0x92,
}

enum ExportType {
  func = 0x00,
  table = 0x01,
  mem = 0x02,
  global = 0x03,
}

enum Section {
  custom = 0,
  type = 1,
  import = 2,
  func = 3,
  table = 4,
  memory = 5,
  global = 6,
  export = 7,
  start = 8,
  element = 9,
  code = 10,
  data = 11,
}

enum Val {
  i32 = 0x7f,
  f32 = 0x7d,
}

// utils

// https://ja.wikipedia.org/wiki/IEEE_754
// 浮動小数点に
export function ieee754(n: number): Uint8Array {
  // 4 byte の Uint8Array を作り、その中に IEEE754 で表現された float を書き込んで変換する
  const buf = new ArrayBuffer(4);
  new DataView(buf).setFloat32(0, n, true);
  return new Uint8Array(buf);
}

Deno.test("ieee754", () => {
  const out = ieee754(1);
  equal(Array.from(out), [0, 0, 128, 63]);
});

export function unsignedLEB128(n: number): number[] {
  const buffer = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) {
      byte |= 0x80;
    }
    buffer.push(byte);
  } while (n !== 0);
  return buffer;
}

// https://webassembly.github.io/spec/core/syntax/types.html#vector-types
// vector は整数、浮動小数点によらない何らかの数値型
function encodeVector(data: any): any[] {
  return [
    ...unsignedLEB128(data.length),
    ...data.flat(Infinity),
  ];
}

type BinaryArray = Array<number | BinaryArray | Uint8Array>;

// https://en.wikipedia.org/wiki/LEB128
// 整数値の内部表現
export function signedLEB128(n: number) {
  const buffer = [];
  let byte: number;
  while (true) {
    byte = n & 0x7f;
    n >>>= 7;
    const v = byte & 0x40;
    if (
      // n が 0 で byte で次の bit がないときは終了
      (n === 0 && v === 0) ||
      // オーバーフローしている
      (n === -1 && v !== 0)
    ) {
      buffer.push(byte);
      return buffer;
    }
    byte |= 0x80;
    buffer.push(byte);
  }
}

Deno.test("signedLEB128", () => {
  console.log("xxxx", signedLEB128(64));
  assert(equal(signedLEB128(0), [0]));
  assert(equal(signedLEB128(1), [1]));
  assert(equal(signedLEB128(63), [63]));
  assert(equal(signedLEB128(64), [192, 0]));
});

export function encodeString(str: string): Uint8Array {
  return new Uint8Array([
    str.length,
    ...Array.from(str).map((s) => s.charCodeAt(0)),
  ]);
}

type FunctionType = [t: typeof functionType, ...rest: BinaryArray];

function createTypeSection(data: number[]) {
  return [
    Section.type,
    ...encodeVector(data),
  ];
}

function createFuncSection(data: number[]) {
  return [
    Section.func,
    ...encodeVector(data),
  ];
}

function createExportSection(data: number[]) {
  return [
    Section.export,
    ...encodeVector(data),
  ];
}

function createCodeSection(data: number[]) {
  return [
    Section.code,
    ...encodeVector(data),
  ];
}

const emit = () => {
  const addFunctionType: BinaryArray = [
    functionType,
    ...encodeVector([Val.f32, Val.f32]),
    ...encodeVector([Val.f32]),
  ];

  // the type section is a vector of function types
  const typeSection = createTypeSection(
    encodeVector([addFunctionType]),
  );

  // the function section is a vector of type indices that indicate the type of each function
  // in the code section
  const funcSection = createFuncSection(
    encodeVector([0x00 /* type index */]),
  );

  // the export section is a vector of exported functions
  const exportSection = createExportSection(
    encodeVector([
      [...encodeString("run"), ExportType.func, 0x00 /* function index */],
    ]),
  );

  const code = [
    Op.local_get,
    ...unsignedLEB128(0),
    Op.local_get,
    ...unsignedLEB128(1),
    Op.f32_add,
  ];

  const functionBody = encodeVector([
    emptyArray, /** locals */
    ...code,
    Op.end,
  ]);

  const codeSection = createCodeSection(
    encodeVector([functionBody]),
  );

  return Uint8Array.from([
    ...MAGIC_MODULE_HEADER,
    ...MODULE_VERSION,
    ...typeSection,
    ...funcSection,
    ...exportSection,
    ...codeSection,
  ]);
};

export async function runModule(
  binary: Uint8Array,
  name: string,
  args: number[],
) {
  const memory = new WebAssembly.Memory({ initial: 1 });
  const imports: WebAssembly.Imports = {
    env: {
      buffer: memory,
      log(data: number) {
        console.log("[wasm:log]", data);
      },
    },
  };

  const ret = await WebAssembly.instantiate(binary, imports);
  const exports = ret.instance.exports as {
    [key: string]: (...args: number[]) => number;
  };
  return exports[name](...args);
}

Deno.test("run", async () => {
  const binary = emit();
  const out = await runModule(binary, "run", [4, 2]);
  assert(out === 6, "should be 6");
});
