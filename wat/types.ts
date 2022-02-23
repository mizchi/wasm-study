export type Token = {
  raw: string;
  d: number;
  pos: [start: number, end: number];
  t?: SyntaxType;
};

export enum SyntaxType {
  WhiteSpace = 'WhiteSpace',
  NewLine = 'NewLine',
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

export type WhitespaceNode = {
  t: SyntaxType.WhiteSpace,
  raw: string;
  pos: [start: number, end: number],
}

export type NewLineNode = {
  t: SyntaxType.NewLine,
  raw: string;
  pos: [start: number, end: number],
}

export type LineCommentNode = {
  t: SyntaxType.LineComment,
  depth: number;
  raw: string;
  pos: [start: number, end: number],
  tpos: [start: number, end: number],
}

export type Program = {
  t: SyntaxType.Program,
  children: ParenNode[],
  pos: [start: number, end: number],
  tpos: [start: number, end: number],
}

export type LiteralNode = {
  t: SyntaxType.Literal,
  value: string,
  pos: [start: number, end: number]
}
export type Node = Program
  | LiteralNode
  | OpNode
  | ParenNode
  | LineCommentNode
  | NewLineNode
  | WhitespaceNode
  ;
