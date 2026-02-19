import EloquentModel from './EloquentModel';

export interface TNoKey {
  field: string;
  value?: string;
}

export class NoKeyClass extends EloquentModel<TNoKey> {}

interface NoKey extends TNoKey {}
class NoKey extends NoKeyClass {}

export default NoKey;
