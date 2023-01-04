export type AssertEqual<A, B> = (<X>() => X extends A ? 1 : 0) extends <Y>() => Y extends B ? 1 : 0 ? true : false

export const assertEqual = <A, B>(val: AssertEqual<A, B>): AssertEqual<A, B> => val
