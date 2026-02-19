import EloquentModel from './EloquentModel';

export interface TNoTable {
  field: string;
  value?: string;
}

export class NoTableClass extends EloquentModel<TNoTable> {}

interface NoTable extends TNoTable {}
class NoTable extends NoTableClass {}

export default NoTable;
