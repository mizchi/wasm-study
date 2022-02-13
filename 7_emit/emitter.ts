import { assert } from "https://deno.land/std@0.122.0/testing/asserts.ts";
import {
  Binary,
  signedLEB128 as int,
  unsignedLEB128 as u32,
  vec,
} from "./utils.ts";

const emptyArray = 0x0;

enum Type {
  Func = 0x60,
}

// https://webassembly.github.io/spec/core/binary/types.html#binary-blocktype
enum Blocktype {
  void = 0x40,
}

// https://webassembly.github.io/spec/core/binary/instructions.html
enum Op {
  unreachable = 0x00,
  nop = 0x01,
  block = 0x02,
  loop = 0x03,
  if = 0x04,
  else = 0x05,
  end = 0x0b,
  br = 0x0c,
  br_if = 0x0d,
  br_table = 0x0e,
  return = 0x0f,
  call = 0x10,
  call_indirect = 0x11,

  local_get = 0x20,
  local_set = 0x21,
  i32_const = 0x41,
  i64_const = 0x42,
  f32_const = 0x43,
  f64_const = 0x44,
  i32_eqz = 0x45,
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

// https://webassembly.github.io/spec/core/binary/types.html#binary-numtype
enum Valtype {
  externref = 0x6f,
  funcref = 0x70,
  vectype = 0x7b,
  i32 = 0x7f,
  i64 = 0x7e,
  f32 = 0x7d,
  f64 = 0x7c,
}

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
    ] as Binary;
    return Uint8Array.from(nonFlat.flat());
  }

  function _type(expr: TypeExpr) {
    const idx = _types.length;
    _types.push(expr);
    return idx as Ptr<Section.type>;
  }

  function _ftype(
    params: Array<Valtype>,
    results: Array<Valtype>,
  ) {
    return _type([
      Type.Func,
      ...vec(params),
      ...vec(results),
    ]) as Ptr<
      Section.type
    >;
  }

  function _func(
    params: Valtype[],
    returns: Valtype[],
    locals: Valtype[],
    stmts: Array<number | Binary>,
  ) {
    const ptr = _funcs.length + _imports.length;

    const typePtr = _ftype(params, returns);
    _funcs.push([typePtr]);

    // local 変数
    const encoded_locals = locals.map((
      l,
      i,
    ) => [...u32(params.length + i), l]);

    // const blocks: Binary[] = [];
    function _funcBody(stmts: Array<number | Binary>) {
      return stmts.flat(Infinity);
    }

    const encoded_code = [
      ...vec(encoded_locals),
      ..._funcBody(stmts),
      Op.end,
    ].flat();

    _codes.push(vec(encoded_code));
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
    build: _build,
    ftype: _ftype,
  };
}

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
    ...u32(local_idx),
  ];
}

function local_set(local_idx: number, val: Binary): Binary {
  return [
    ...val,
    Op.local_set,
    ...u32(local_idx),
  ];
}

const emit = () => {
  const $ = emitter();
  const i32_void = $.ftype([Valtype.i32], []);
  const logPtr = $.import("env", "log", i32_void);

  const add = $.func(
    [Valtype.i32, Valtype.i32],
    [Valtype.i32],
    [],
    [
      i32_add(
        local_get(0),
        i32_add(
          local_get(1),
          i32_const(5),
        ),
      ),
    ],
  );

  const id = $.func(
    [Valtype.i32],
    [Valtype.i32],
    [],
    [
      local_get(0),
    ],
  );

  const print = $.func(
    [Valtype.i32],
    [],
    [],
    [
      local_get(0),
      Op.call,
      u32(logPtr),
    ],
  );

  const cond = $.func(
    [Valtype.i32],
    [Valtype.i32],
    [Valtype.i32],
    [
      // if
      ...[
        // block: 0
        Op.block,
        Blocktype.void,
        // $0 == 1
        local_get(0),
        Op.i32_eqz,
        ...[Op.br_if, ...int(0)],
        // run body
        local_set(1, i32_const(42)),
        Op.end,
      ],
      // else
      ...[
        // block: 1
        Op.block,
        Blocktype.void,
        // $0 == 1
        local_get(0),
        i32_const(1),
        Op.i32_eq,
        Op.br_if,
        int(0),
        local_set(1, i32_const(0)),
        Op.end,
      ],
      local_get(1),
    ],
  );

  $.export("add", add);
  $.export("id", id);
  $.export("print", print);
  $.export("cond", cond);

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

Deno.test("cond", () => {
  assert(
    exports.cond(1) === 42,
  );
  assert(
    exports.cond(0) === 0,
  );
});
