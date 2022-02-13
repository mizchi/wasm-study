import {
  assert,
  equal,
} from "https://deno.land/std@0.122.0/testing/asserts.ts";

export type Binary = number[];

// https://ja.wikipedia.org/wiki/IEEE_754
// 浮動小数点に
export function ieee754(n: number): number[] {
  // 4 byte の Uint8Array を作り、その中に IEEE754 で表現された float を書き込んで変換する
  const buf = new ArrayBuffer(4);
  new DataView(buf).setFloat32(0, n, true);
  return Array.from(new Uint8Array(buf));
}

Deno.test("ieee754", () => {
  const out = ieee754(1);
  equal(out, [0, 0, 128, 63]);
});

// https://webassembly.github.io/spec/core/syntax/types.html#vector-types
// vector は整数、浮動小数点によらない何らかの数値型
export function vec(data: Binary | Binary[]): Binary {
  return [
    // データ長
    ...unsignedLEB128(data.length),
    ...data.flat(4),
  ];
}

Deno.test("vec", () => {
  assert(equal(vec([]), [0]));
  assert(equal(vec([1]), [1, 1]));
  assert(equal(vec([1, 2, 3]), [3, 1, 2, 3]));
});

export function unsignedLEB128(n: number): number[] {
  const buffer = [];
  do {
    let byte = n & 0x7f;
    n >>>= 7;
    if (n !== 0) {
      byte |= 0x80;
    }
    buffer.push(byte);
  } while (n !== 0);
  return buffer;
}

// https://en.wikipedia.org/wiki/LEB128
// 整数値の内部表現
export function signedLEB128(n: number) {
  const buffer = [];
  let byte: number;
  const isNegative = n < 0;
  const bitCount = Math.ceil(Math.log2(Math.abs(n))) + 1;
  while (true) {
    byte = n & 0x7f;
    n >>= 7;
    if (isNegative) {
      n = n | -(1 << (bitCount - 8));
    }
    const v = byte & 0x40;
    if (
      // n が 0 で byte で次の bit がないときは終了
      (n === 0 && v === 0) ||
      // オーバーフローしている
      (n === -1 && v !== 0x40)
    ) {
      buffer.push(byte);
      return buffer;
    }
    byte |= 0x80;
    buffer.push(byte);
  }
}

Deno.test("signedLEB128", () => {
  // console.log("xxxx", signedLEB128(64));
  assert(equal(signedLEB128(0), [0]));
  assert(equal(signedLEB128(1), [1]));
  assert(equal(signedLEB128(63), [63]));
  assert(equal(signedLEB128(64), [192, 0]));
});
