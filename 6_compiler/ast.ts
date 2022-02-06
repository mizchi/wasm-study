export enum Op {
  MODULE = "module",
  LOCAL = "local",
  CALL = "call",

  // func
  FUNC = "func",
  EXPORT = "export",
  PARAM = "param",
  RESULT = "result",

  I32_CONST = "i32.const",
  I32_ADD = "i32.add",
  I32_MUL = "i32.mul",

  I64_CONST = "i64.const",
  I64_ADD = "i64.add",
  I64_MUL = "i64.mul",

  F32_CONST = "f32.const",
  F32_ADD = "f32.add",
  F32_MUL = "f32.mul",

  F64_CONST = "f64.const",
  F64_ADD = "f64.add",
  F64_MUL = "f64.mul",
}

export enum DataType {
  i32 = "i32",
  i64 = "i64",
  f32 = "f32",
  f64 = "f64",
}

export type Ident = `$${string}`;
export type Local = [op: Op.LOCAL, ident: Ident, type: DataType];
export type Module = [op: Op.MODULE, ...body: Func[]];
export type Param = [op: Op.PARAM, ident: Ident, dataType: DataType];
export type Result = [op: Op.RESULT, dataType: DataType];
export type Export = [op: Op.EXPORT, name: `"${string}"`];
export type Func = [
  op: Op.FUNC,
  // ex: Export,
  ...body: AST[],
  // params: Param[],
  // result: Result,
  // ...body: AST[],
];

type I32_const = [op: Op.I32_CONST, val: number];
type I32_add = [op: Op.I32_ADD, a: AST, b: AST];

type AST =
  | Module
  | Local
  | Func
  | Local
  | Param
  | Result
  | Export
  | I32_const
  | I32_add;

export const astToCode = (ast: AST): string => {
  const [op, ...args] = ast;
  const bodyCode = args.map((arg) => {
    if (Array.isArray(arg)) return astToCode(arg as AST);
    return arg;
  });
  return `(${op} ${bodyCode.join(" ")})`;
};

export function $export(name: string): Export {
  return [Op.EXPORT, `"${name}"`];
}

export function $module(...body: Func[]): Module {
  return [Op.MODULE, ...body];
}

export function $param(ident: Ident, dataType: DataType): Param {
  return [Op.PARAM, ident, dataType];
}

export function $result(dataType: DataType): Result {
  return [Op.RESULT, dataType];
}

export function $i32_const(num: number): I32_const {
  return [Op.I32_CONST, num];
}

export function $i32_add(a: AST, b: AST): I32_add {
  return [Op.I32_ADD, a, b];
}

export function $local(ident: Ident, dataType: DataType): Local {
  return [Op.LOCAL, ident, dataType];
}

export function $func(
  ex: Export,
  params: Param[],
  resultType: Result,
  body: AST[],
): Func {
  return [Op.FUNC, ex, ...params, resultType, ...body];
}
