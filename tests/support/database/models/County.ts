import EloquentModel from './EloquentModel';
import Town from './Town';

export interface TCounty {
  id: number;
  name: string;
  towns?: Town[];
}

export class CountyClass extends EloquentModel<TCounty> {}

interface County extends TCounty {}
class County extends CountyClass {}

export default County;
