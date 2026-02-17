import EloquentModel from './EloquentModel';
import Town from './Town';

export interface TCounty {
  id: number;
  name: string;
  towns?: Town[];
}

export default class County extends EloquentModel<TCounty> {}
