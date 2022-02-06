import binaryen from "https://esm.sh/binaryen";
import wabtFn from "https://esm.sh/wabt";

console.log("----------------------");

const COMMENTS = /;;.*/;

function stripComments(wat: string): string {
  return wat.split("\n").map((line: string) => {
    return line.replace(COMMENTS, "");
  }).join("\n");
}

interface CompilerOption {
  exceptions: boolean;
  mutableGlobals: boolean;
  satFloatToInt: boolean;
  signExtension: boolean;
  simd: boolean;
  threads: boolean;
  multiValue: boolean;
  tailCall: boolean;
  bulkMemory: boolean;
  referenceTypes: boolean;
  annotations: boolean;
  gc: boolean;
}

export async function compile(
  wat: string,
  options: Partial<CompilerOption> = {},
): Promise<Uint8Array> {
  const wabt = await wabtFn();
  const defaultOptions: CompilerOption = {
    exceptions: false,
    mutableGlobals: false,
    satFloatToInt: false,
    signExtension: false,
    simd: false,
    threads: false,
    multiValue: false,
    tailCall: false,
    bulkMemory: false,
    referenceTypes: false,
    annotations: false,
    gc: false,
    ...options,
  };
  const wasm = wabt.parseWat("input.wat", stripComments(wat), defaultOptions);
  wasm.validate();
  const buffer = wasm.toBinary({
    log: false,
    canonicalize_lebs: false,
    relocatable: false,
    write_debug_names: false,
  }).buffer;

  const module = binaryen.readBinary(buffer);
  binaryen.setOptimizeLevel(3);
  module.optimize();

  return module.emitBinary();
}
