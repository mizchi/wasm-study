export enum Op {
  MODULE = "module",
  CALL = "call",

  // func
  FUNC = "func",
  EXPORT = "export",
  PARAM = "param",
  RESULT = "result",

  LOCAL = "local",
  LOCAL_GET = "local.get",
  LOCAL_SET = "local.set",

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

export enum T {
  i32 = "i32",
  i64 = "i64",
  f32 = "f32",
  f64 = "f64",
}

// opaque
export type Ident<Type extends T> = `$${string}` & { _: Type };
export type Local<Type extends T> = [
  op: Op.LOCAL,
  ident: Ident<Type>,
  type: Type,
];
export type Local_get<Type extends T> = [
  op: Op.LOCAL_GET,
  ident: Ident<Type>,
];
export type Local_set<Type extends T> = [
  op: Op.LOCAL_SET,
  ident: Ident<Type>,
  value: AstNode,
];

export type Module = [op: Op.MODULE, ...body: Func[]];
export type Param<Type extends T> = [
  op: Op.PARAM,
  ident: Ident<Type>,
  dataType: Type,
];
export type Result = [op: Op.RESULT, dataType: T];
export type Export = [op: Op.EXPORT, name: `"${string}"`];
export type Func = [
  op: Op.FUNC,
  ...body: AstNode[],
  // ex: Export,
  // params: Param[],
  // result: Result,
  // ...body: AST[],
];

export type Expr_i32 =
  | Local<T.i32>
  | Local_get<T.i32>
  | I32_const
  | I32_add;

export type I32_const = [op: Op.I32_CONST, val: number];
export type I32_add = [op: Op.I32_ADD, a: Expr_i32, b: Expr_i32];

export type AstNode =
  | Module
  | Local<T>
  | Func
  | Local<T>
  | Local_get<T>
  | Local_set<T>
  | Param<T>
  | Result
  | Export
  | I32_const
  | I32_add;

export const astToCode = (ast: AstNode): string => {
  const [op, ...args] = ast;
  const bodyCode = args.map((arg) => {
    if (Array.isArray(arg)) return astToCode(arg as AstNode);
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

export function $param<Type extends T>(
  ident: Ident<Type>,
  dataType: T,
): Param<Type> {
  return [Op.PARAM, ident, dataType] as Param<Type>;
}

export function $result(dataType: T): Result {
  return [Op.RESULT, dataType];
}

export function $i32_const(num: number): I32_const {
  return [Op.I32_CONST, num];
}

export function $i32_add(a: Expr_i32, b: Expr_i32): I32_add {
  return [Op.I32_ADD, a, b];
}

export function $local<Type extends T>(
  ident: Ident<Type>,
  dataType: T,
): Local<Type> {
  return [Op.LOCAL, ident, dataType] as Local<Type>;
}

export function $local_get<Type extends T>(
  ident: Ident<Type>,
): Local_get<Type> {
  return [Op.LOCAL_GET, ident];
}

export function $local_set<Type extends T>(
  ident: Ident<Type>,
  value: AstNode,
): Local_set<Type> {
  return [Op.LOCAL_SET, ident, value];
}

export function $func(
  ex: Export,
  params: Param<T>[],
  resultType: Result,
  body: AstNode[],
): Func {
  return [Op.FUNC, ex, ...params, resultType, ...body];
}

export function $ident<Type extends T>(
  name: `$${string}`,
): Ident<Type> {
  return name as Ident<Type>;
}
