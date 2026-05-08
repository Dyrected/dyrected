declare module 'jexl' {
  const jexl: {
    evalSync: (expression: string, context: any) => any;
    eval: (expression: string, context: any) => Promise<any>;
    addFunction: (name: string, fn: (...args: any[]) => any) => void;
    addTransform: (name: string, fn: (...args: any[]) => any) => void;
    addBinaryOp: (name: string, precedence: number, fn: (a: any, b: any) => any) => void;
    addUnaryOp: (name: string, fn: (a: any) => any) => void;
  };
  export default jexl;
}
