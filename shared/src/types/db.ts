export interface IListQuery {
  start: number
  pageSize: number
}

export interface IDBListResponse<ObjectType> {
  nextItem?: number
  items: ObjectType[]
}
