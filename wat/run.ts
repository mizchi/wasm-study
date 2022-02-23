import { format } from "./formatter.ts";
const input = await Deno.readTextFile("./no-sexp.wat");

console.log(format(input));
