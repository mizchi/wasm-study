#!/usr/bin/bash

deno run -A build.ts
wat2wasm -o run.wasm run.wat
deno run -A run.ts