import { format } from "./formater.ts";
const input = await Deno.readTextFile("./no-sexp.wat");

console.log(format(input));
