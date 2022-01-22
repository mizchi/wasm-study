await Deno.run({
  cmd: ["wat2wasm", "wat/run.wat", "-o", "wasm/run.wasm"],
  stdout: "piped",
  stderr: "piped",
  stdin: "piped",
});
const binary = Deno.readFileSync("./wasm/hello.wasm");
const module = new WebAssembly.Module(binary);

console.log(module);
