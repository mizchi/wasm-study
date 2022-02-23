export type Token = {
  raw: string;
  d: number;
  pos: [start: number, end: number]
};

export enum SyntaxType {
  LineComment = "LineComment",
  Program = 'Program',
  Paren = "Paren",
  Op = "Op",
  Literal = "Literal",
};

export type OpNode = {
  t: SyntaxType.Op,
  op: string,
  pos: [start: number, end: number]
}

export type ParenNode = {
  t: SyntaxType.Paren,
  children: Node[],
  depth: number;
  pos: [start: number, end: number],
  tpos: [start: number, end: number],
}

export type LineCommentNode = {
  t: SyntaxType.LineComment,
  depth: number;
  pos: [start: number, end: number],
  tpos: [start: number, end: number],
}

export type Node = {
  t: SyntaxType.Program,
  children: ParenNode[],
  pos: [start: number, end: number],
  tpos: [start: number, end: number],
} | {
  t: SyntaxType.Literal,
  value: string,
  pos: [start: number, end: number]
}
  | OpNode
  | ParenNode
  | LineCommentNode
  ;
