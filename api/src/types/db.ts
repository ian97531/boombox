export interface ITimedListQuery {
  startTime: number
  pageSize: number
}

export interface IDBListResponse<ObjectType> {
  moreResults: boolean
  items: ObjectType[]
}
