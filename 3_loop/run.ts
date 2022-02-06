const binary = Deno.readFileSync("./run.wasm");

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
