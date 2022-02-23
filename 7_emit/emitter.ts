import {
  assert,
  equal,
} from "https://deno.land/std@0.122.0/testing/asserts.ts";
import {
  Binary,
  signedLEB128 as int,
  unsignedLEB128 as u32,
  vec,
} from "./utils.ts";

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
  // lt int
  i32_lt_s = 0x48,
  // lt uint
  i32_lt_u = 0x49,
  // le(>=) int
  i32_le_s = 0x4c,

  i32_gt_s = 0x4a,
  i32_gt_u = 0x4b,
  i32_ge_s = 0x4e,
  i32_ge_u = 0x4f,

  i32_gt = 0x5E,
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
type InstrCtx = {
  local(type: Valtype): number;
};

type Ptr<T> = number & { __type__: T };

// AST Builder
function emitter() {
  const _types: Binary[] = [];
  const _funcs: Binary[] = [];
  const _imports: Binary[] = [];
  const _exports: Binary[] = [];
  const _codes: Binary[] = [];

  function _build() {
    const binary = [
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
    return Uint8Array.from(binary.flat());
  }

  function _type(expr: TypeExpr) {
    const idx = _types.length;
    _types.push(expr);
    return idx as Ptr<Section.type>;
  }

  function ftype(
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
  function _instr(stmts: Array<number | Binary>, _depth: number) {
    // TODO
    return stmts.flat(Infinity);
  }

  function call(funcPtr: Ptr<Section.func>, args: Binary[]): Binary {
    return [
      ...args,
      Op.call,
      u32(funcPtr),
    ].flat();
  }

  function func(
    params: Valtype[],
    returns: Valtype[],
    stmtsBuilder: (
      ctx: InstrCtx,
      depth: number,
    ) => Array<number | Binary>,
  ) {
    const ptr = _funcs.length + _imports.length;
    const typePtr = ftype(params, returns);
    _funcs.push([typePtr]);

    const _locals: Valtype[] = [];

    const ctx: InstrCtx = {
      local(type: Valtype) {
        const idx = _locals.length;
        _locals.push(type);
        return (idx + params.length) as Ptr<number>;
      },
    };

    const body = _instr(stmtsBuilder(ctx, 0), 0).flat(1);
    _codes.push(vec([
      ...vec(
        // encode locals
        _locals.map((
          local,
          idx,
        ) => [...u32(params.length + idx), local]),
      ).flat(),
      ...body,
      Op.end,
    ]));
    return ptr as Ptr<Section.func>;
  }
  function export_(name: string, funcPtr: Ptr<Section.func>) {
    const idx = _exports.length;
    _exports.push([...encodeString(name), ExportType.func, funcPtr]);
    return idx as Ptr<Section.export>;
  }
  function import_(ns: string, name: string, typePtr: Ptr<Section.type>) {
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

  const if_ = (i32_expr: Binary, then_: Binary[], else_: Binary[]) => {
    return [
      ...i32_expr,
      Op.if,
      Valtype.i32,
      ...else_,
      Op.else,
      ...then_,
      Op.end,
    ];
  };

  return {
    export: export_,
    import: import_,
    if: if_,
    func: func,
    build: _build,
    ftype: ftype,
    call,
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
    () => [
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
    () => [
      local_get(0),
    ],
  );

  const localVar = $.func(
    [Valtype.i32],
    [Valtype.i32],
    (ctx) => {
      const localVal = ctx.local(Valtype.i32);
      return [
        local_set(localVal, i32_const(11)),
        local_get(localVal),
      ];
    },
  );

  const print = $.func(
    [Valtype.i32],
    [],
    () => [
      $.call(logPtr, [local_get(0)]),
    ],
  );

  const cond = $.func(
    [Valtype.i32],
    [Valtype.i32],
    () => [
      ...$.if(
        [
          ...local_get(0),
          Op.i32_eqz,
        ],
        [
          i32_const(42),
        ],
        [
          i32_const(0),
        ],
      ),
    ],
  );

  const while_ = (expr: Binary, stmts: Binary[]) => {
    return [];
  };

  const loop = $.func(
    [Valtype.i32],
    [Valtype.i32],
    (ctx, _depth) => {
      // const $sum = ctx.local(Valtype.i32);
      let $sum = 0;
      return [
        // sum = 0;
        local_set($sum, i32_const(0)),
        // 0: continue block
        Op.loop,
        Blocktype.void,
        // 1: break block
        Op.block,
        Blocktype.void,
        // expression
        // break if sum > 10
        i32_const(10),
        local_get($sum),
        // sum <= 10
        Op.i32_ge_s,
        // break
        Op.br_if,
        u32(1),
        Op.end,
        // while body
        // sum = sum + 1
        local_get($sum),
        Op.i32_const,
        ...int(1),
        Op.i32_add,
        Op.local_set,
        u32($sum),
        $.call(logPtr, [local_get($sum)]),
        ...[Op.br, u32(0)],
        Op.end,
        $.call(logPtr, [local_get($sum)]),
        ...local_get($sum),
      ];
    },
  );

  $.export("add", add);
  $.export("id", id);
  $.export("print", print);
  $.export("cond", cond);
  $.export("localVar", localVar);
  $.export("loop", loop);

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

Deno.test("localVar", () => {
  assert(exports.localVar() === 11);
});

Deno.test("print", () => {
  exports.print(4);
});

Deno.test("cond", () => {
  // console.log(exports.cond(0));
  assert(
    exports.cond(1) === 42,
  );
  assert(
    exports.cond(0) === 0,
  );
});

Deno.test("myloop", () => {
  try {
    // console.log("---------------~~~~~~~~~~~~~~~~", exports.loop(1));
    // console.log("=============================loop", exports.loop(7));
    assert(
      equal(exports.loop(7), 10),
    );
  } catch (err) {
    console.error(err);
    throw err;
  }
});
