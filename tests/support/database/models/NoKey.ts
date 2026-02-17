import EloquentModel from './EloquentModel';

export interface TNoKey {
  field: string;
  value?: string;
}

export default class NoKey extends EloquentModel<TNoKey> {}
