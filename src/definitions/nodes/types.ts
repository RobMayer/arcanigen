export type PayloadOf<C> = C extends { _PAYLOAD: infer P } ? P : never;
export type OutputOf<C> = C extends { _OUTPUT: infer O } ? O : never;
