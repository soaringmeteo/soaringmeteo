import {type Color} from "ol/color";
import {type ExpressionValue} from "ol/style/expressions";

enum ExprBrand { _ = "" }

export type Expr<A> = ExpressionValue & ExprBrand;
const expr = <A>(value: ExpressionValue): Expr<A> => value as Expr<A>;

export type SingleCaseExpr<A> = [Expr<boolean>, Expr<A>]

export const caseExpr = <A>(cases: Array<SingleCaseExpr<A>>, fallback: Expr<A>): Expr<A> => expr([
  'case',
  ...cases.flatMap(([condition, value]) => singleCase(condition, value)),
  fallback
]);
export const singleCase = <A>(condition: Expr<boolean>, value: Expr<A>): SingleCaseExpr<A> => [condition, value];

export const color = (red: number, green: number, blue: number, alpha: number): Expr<Color> =>
  expr([red, green, blue, alpha]);

export const eq = <A>(lhs: Expr<A>, rhs: Expr<A>): Expr<boolean> =>
  expr(['==', lhs, rhs]);

export const lt = <A>(lhs: Expr<A>, rhs: Expr<A>): Expr<boolean> =>
  expr(['<', lhs, rhs]);

export const band = (bandIndex: number): Expr<number> =>
  expr(['band', bandIndex]);

export const literal = (value: number): Expr<number> => expr(value);
