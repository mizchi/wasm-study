import { compile } from "./wasm_helper.ts";
// import {  } from "./ast.ts";
import {
  $export,
  $func,
  $i32_add,
  $i32_const,
  $ident,
  $local_get,
  $module,
  $param,
  $result,
  astToCode,
  Module,
  T,
} from "./ast.ts";

const myAst: Module = $module(
  $func(
    $export("run"),
    [
      $param($ident("$a"), T.i32),
      $param($ident("$b"), T.i32),
    ],
    $result(T.i32),
    [
      // $local("$i", DataType.i32),
      // $i32_add($i32_const(1), $i32_const(3)),
      // $i32_add($local_get("$a"), $i32_const(3)),
      $i32_add(
        $local_get($ident("$a")),
        $i32_add($local_get($ident("$b")), $i32_const(3)),
      ),
      // $local_set(, $i32_const(3)),
    ],
  ),
);

const code = astToCode(myAst);

const binary = await compile(code);

export async function run() {
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
    run(a: number, b: number): number;
  };
  const x = exports.run(4, 3);
  console.log(x);
}

run();

// console.log(binary);
