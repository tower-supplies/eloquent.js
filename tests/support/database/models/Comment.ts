import EloquentModel from './EloquentModel';
import Order from './Order';
import User from './User';

export interface CommentAttributes {
  id: number;
  comment: string;
  commentable_id: number;
  commentable_type: string;
  order?: Order;
  user?: User;
}

export class CommentClass extends EloquentModel<CommentAttributes> {}

interface Comment extends CommentAttributes {}
class Comment extends CommentClass {}

export default Comment;
