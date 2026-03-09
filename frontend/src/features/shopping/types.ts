// Types matching the Shopping API contract DTOs

export interface ItemDto {
  id: string;
  name: string;
  quantity: number;
  addedByUserId: number;
  addedByUserName: string;
  isBought: boolean;
  boughtAt: string | null;
  boughtByUserId: number | null;
  boughtByUserName: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
}

export interface ShoppingListResponse {
  active: ItemDto[];
  recentlyBought: ItemDto[];
}

export interface ItemDetailDto {
  item: ItemDto;
  comments: CommentDto[];
}

export interface CommentDto {
  id: string;
  userId: number;
  userName: string;
  text: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemRequest {
  name: string;
  quantity: number;
}

export interface UpdateItemRequest {
  name: string;
  quantity: number;
}

export interface CreateCommentRequest {
  text: string;
}

export interface UpdateCommentRequest {
  text: string;
}
