import EloquentModel from './EloquentModel';

export interface NoKeyAttributes {
  field: string;
  value?: string;
}

export class NoKeyClass extends EloquentModel<NoKeyAttributes> {}

interface NoKey extends NoKeyAttributes {}
class NoKey extends NoKeyClass {}

export default NoKey;
