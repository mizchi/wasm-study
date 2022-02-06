import { compile } from "./wasm_helper.ts";
import { $module, astToCode, Module } from "./ast.ts";
import {
  $export,
  $func,
  $i32_add,
  $i32_const,
  $local,
  $param,
  $result,
  DataType,
} from "./ast.ts";

const myAst: Module = $module(
  $func(
    $export("run"),
    [$param("$n", DataType.i32)],
    $result(DataType.i32),
    [
      $local("$i", DataType.i32),
      $i32_add($i32_const(1), $i32_const(3)),
    ],
  ),
);

const code = astToCode(myAst);

// console.log(code);

const binary = await compile(code);

export async function run() {
  const memory = new WebAssembly.Memory({ initial: 1 });
  const importObject: WebAssembly.Imports = {
    env: {
      buffer: memory,
      log(data: number) {
        console.log("[wasm:log]", data);
      },
    },
  };

  const ret = await WebAssembly.instantiate(binary, importObject);
  const exports = ret.instance.exports as {
    run(n: number): number;
  };

  const x = exports.run(4);
  console.log(x);
}

run();

// console.log(binary);
