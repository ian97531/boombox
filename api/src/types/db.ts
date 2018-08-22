export interface ITimedListQuery {
  guid: string
  startTime: number
  pageSize: number
}

export interface IDBListResponse<ObjectType> {
  moreResults: boolean
  items: ObjectType[]
}
