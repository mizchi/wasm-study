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
  call = 0x10,
  // https://webassembly.github.io/spec/core/binary/instructions.html
  local_get = 0x20,
  i32_const = 0x41,
  i64_const = 0x42,
  f32_const = 0x43,
  f64_const = 0x44,

  i32_eq = 0x46,
  i32_ne = 0x47,
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

const uint = unsignedLEB128;
const int = signedLEB128;

export function encodeString(str: string): number[] {
  return [str.length, ...Array.from(str).map((s) => s.charCodeAt(0))];
}

type Vec = number[];
type TypeExpr = [
  type: Type.Func,
  ...xs: Vec,
];
type FuncExpr = Vec;
type ExportExpr = Vec;
type CodeExpr = Vec;
type ImportExpr = Vec;
type Ptr<T> = number & { __type__: T };

// AST Builder
function emitter() {
  const _types: Array<TypeExpr> = [];
  const _funcs: Array<FuncExpr> = [];
  const _imports: Array<ImportExpr> = [];
  const _exports: Array<ExportExpr> = [];
  const _codes: Array<CodeExpr> = [];

  function _build() {
    return Uint8Array.from([
      // MAGIC_MODULE_HEADER
      ...[0x00, 0x61, 0x73, 0x6d],
      // MODULE_VERSION
      ...[0x01, 0x00, 0x00, 0x00],
      // Type Section
      Section.type,
      ...vec(vec(_types)),
      // Import Section
      Section.import,
      ...vec(vec(_imports)),
      // Func Section
      Section.func,
      ...vec(vec(_funcs)),
      // Export Section
      Section.export,
      ...vec(vec(_exports)),
      // Code Section
      Section.code,
      ...vec(
        vec(_codes),
      ),
    ]);
  }

  function _addType(expr: TypeExpr) {
    const idx = _types.length;
    _types.push(expr);
    return idx as Ptr<Section.type>;
  }

  function _funcType(
    params: Array<Val>,
    results: Array<Val>,
  ) {
    return _addType([
      Type.Func,
      ...vec(params),
      ...vec(results),
    ]) as Ptr<
      Section.type
    >;
  }
  function _func(typePtr: Ptr<Section.type>, code: CodeExpr) {
    const ptr = _funcs.length + _imports.length;
    _funcs.push([typePtr]);
    _codes.push(vec(code));
    return ptr as Ptr<Section.func>;
  }
  function _export(name: string, funcPtr: Ptr<Section.func>) {
    const idx = _exports.length;
    _exports.push([...encodeString(name), ExportType.func, funcPtr]);
    return idx as Ptr<Section.export>;
  }
  function _import(ns: string, name: string, typePtr: Ptr<Section.type>) {
    if (_funcs.length) throw new Error("Can not import: already func added");
    const ptr = _imports.length;
    _imports.push([
      ...encodeString(ns),
      ...encodeString(name),
      ExportType.func,
      typePtr,
    ]);
    return ptr as Ptr<Section.func>;
  }
  return {
    export: _export,
    import: _import,
    func: _func,
    funcType: _funcType,
    build: _build,
  };
}

const emit = () => {
  const $ = emitter();
  const addFuncType = $.funcType([Val.f32, Val.f32], [Val.f32]);
  const logPtr = $.import("env", "log", $.funcType([Val.i32], []));

  const addRef = $.func(
    addFuncType,
    [
      emptyArray, /** locals */
      Op.local_get,
      ...uint(0),
      Op.local_get,
      ...uint(1),
      Op.f32_add,
      Op.end,
    ],
  );

  const idRef = $.func(
    $.funcType([Val.i32], [Val.i32]),
    [
      emptyArray, /** locals */
      Op.local_get,
      ...uint(0),
      Op.end,
    ],
  );
  const printPtr = $.func(
    $.funcType([Val.i32], []),
    [
      emptyArray, /** locals */
      Op.local_get,
      ...int(0),
      Op.call,
      ...uint(logPtr),
      Op.end,
    ],
  );

  $.export("run", addRef);
  $.export("id", idRef);
  $.export("print", printPtr);
  return $.build();
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

const binary = emit();
await Deno.writeFile("out.wasm", binary);

Deno.test("run", async () => {
  const binary = emit();
  const out = await runModule(binary, "run", [4, 2]);
  assert(out === 6, "should be 6");
});

Deno.test("id", async () => {
  const binary = emit();
  const out = await runModule(binary, "id", [1]);
  assert(out === 1);
});

Deno.test("print", async () => {
  const binary = emit();
  const out = await runModule(binary, "print", [1]);
  assert(out === undefined);
});
