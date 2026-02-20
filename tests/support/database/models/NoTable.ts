import EloquentModel from './EloquentModel';

export interface NoTableAttributes {
  field: string;
  value?: string;
}

export class NoTableClass extends EloquentModel<NoTableAttributes> {}

interface NoTable extends NoTableAttributes {}
class NoTable extends NoTableClass {}

export default NoTable;
