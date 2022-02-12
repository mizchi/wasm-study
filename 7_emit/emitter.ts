import {
  assert,
  equal,
} from "https://deno.land/std@0.122.0/testing/asserts.ts";

const emptyArray = 0x0;

enum Type {
  Func = 0x60,
}

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
function vec(data: any): number[] {
  return [
    // データ長
    ...unsignedLEB128(data.length),
    // 実体
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
  // console.log("xxxx", signedLEB128(64));
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

type Vec = number[];
type TypeExpr = [
  type: Type.Func,
  ...xs: Vec,
];
type FuncExpr = Vec;
type ExportExpr = Vec;
type CodeExpr = Vec;

const emit = () => {
  const types: Array<TypeExpr> = [];
  const funcs: Array<FuncExpr> = [];
  const exports: Array<ExportExpr> = [];

  function addType(expr: TypeExpr) {
    const idx = types.length;
    types.push(expr);
    return idx;
  }

  function addFunc(params: Array<Val>, returns: Array<Val>) {
    const idx = funcs.length;
    const typeRef = addType([Type.Func, ...vec(params), ...vec(returns)]);
    funcs.push([typeRef]);
    return idx;
  }

  function addExport(name: string, funcRef: number) {
    const idx = exports.length;
    exports.push([...encodeString(name), ExportType.func, funcRef]);
    return idx;
  }

  const addFuncRef = addFunc([Val.f32, Val.f32], [Val.f32]);
  addExport("run", addFuncRef);

  const code = [
    Op.local_get,
    ...unsignedLEB128(0),
    Op.local_get,
    ...unsignedLEB128(1),
    Op.f32_add,
  ];

  const codes: Array<CodeExpr> = [];
  function addCode(t: number[]) {
    const idx = codes.length;
    codes.push(t);
    return idx;
  }
  addCode(
    vec([
      emptyArray, /** locals */
      ...code,
      Op.end,
    ]),
  );

  return Uint8Array.from([
    // MAGIC_MODULE_HEADER
    ...[0x00, 0x61, 0x73, 0x6d],
    // MODULE_VERSION
    ...[0x01, 0x00, 0x00, 0x00],
    // Type Section
    Section.type,
    ...vec(vec(types)),
    // Func Section
    Section.func,
    ...vec(vec(funcs)),
    // Export Section
    Section.export,
    ...vec(vec(exports)),
    // Code Section
    Section.code,
    ...vec(
      vec(codes),
    ),
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
