import { assert } from "https://deno.land/std@0.122.0/testing/asserts.ts";
import { signedLEB128 as int, unsignedLEB128 as uint, vec } from "./utils.ts";

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
  i32_add = 0x6A,
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

// type Binary = number | Binary[];
type Binary = number[];

export function encodeString(str: string): number[] {
  return [str.length, ...Array.from(str).map((s) => s.charCodeAt(0))];
}

type Vec = number[];
type TypeExpr = [
  type: Type.Func,
  ...xs: Vec,
];
type Ptr<T> = number & { __type__: T };

// AST Builder
function emitter() {
  const _types: Binary[] = [];
  const _funcs: Binary[] = [];
  const _imports: Binary[] = [];
  const _exports: Binary[] = [];
  const _codes: Binary[] = [];

  function _build() {
    const nonFlat = [
      // MAGIC_MODULE_HEADER
      [0x00, 0x61, 0x73, 0x6d],
      // MODULE_VERSION
      [0x01, 0x00, 0x00, 0x00],
      // Type Section
      Section.type,
      vec(vec(_types)),
      // Import Section
      Section.import,
      vec(vec(_imports)),
      // Func Section
      Section.func,
      vec(vec(_funcs)),
      // Export Section
      Section.export,
      vec(vec(_exports)),
      // Code Section
      Section.code,
      vec(vec(_codes)),
    ];
    return Uint8Array.from(nonFlat.flat(Infinity));
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
  function _func(typePtr: Ptr<Section.type>, code: Binary) {
    const ptr = _funcs.length + _imports.length;
    _funcs.push([typePtr]);
    _codes.push(vec(code).flat(Infinity));
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

  function _code(stmts: Binary[]) {
    return [
      emptyArray,
      ...stmts,
      Op.end,
    ].flat();
  }

  return {
    export: _export,
    import: _import,
    func: _func,
    funcType: _funcType,
    build: _build,
    code: _code,
  };
}

const emit = () => {
  const $ = emitter();
  const i32_void = $.funcType([Val.i32], []);
  const i32i32_i32 = $.funcType([Val.i32, Val.i32], [Val.i32]);
  const logPtr = $.import("env", "log", i32_void);

  function i32_add(a: Binary, b: Binary) {
    return [
      ...a,
      ...b,
      Op.i32_add,
    ];
  }

  function i32_const(n: number): Binary {
    return [
      Op.i32_const,
      ...int(n),
    ];
  }

  function local_get(local_idx: number): Binary {
    return [
      Op.local_get,
      ...uint(local_idx),
    ];
  }

  const add = $.func(
    i32i32_i32,
    $.code([
      i32_add(
        local_get(0),
        i32_add(
          local_get(1),
          i32_const(5),
        ),
      ),
    ]),
  );

  const id = $.func(
    $.funcType([Val.i32], [Val.i32]),
    $.code([
      local_get(0),
    ]),
  );

  const print = $.func(
    i32_void,
    $.code([
      local_get(0),
      [Op.call, ...uint(logPtr)],
    ]),
  );

  $.export("add", add);
  $.export("id", id);
  $.export("print", print);

  return $.build();
};

const defaultImports: WebAssembly.Imports = {
  env: {
    buffer: new WebAssembly.Memory({ initial: 1 }),
    log(data: number) {
      console.log("[wasm:log]", data);
    },
  },
};

export async function compile(
  binary: Uint8Array,
  imports: WebAssembly.Imports = defaultImports,
) {
  const ret = await WebAssembly.instantiate(binary, imports);
  return ret.instance.exports as {
    [key: string]: (...args: number[]) => number;
  };
}

const binary = emit();
// await Deno.writeFile("out.wasm", binary);

const exports = await compile(binary);

Deno.test("add", () => {
  assert(exports.add(4, 2) === 11);
});

Deno.test("id", () => {
  assert(exports.id(1) === 1);
});

Deno.test("print", () => {
  exports.print(4);
});
