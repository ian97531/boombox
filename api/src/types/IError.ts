export default interface IError extends Error {
  status: number
  title: string
}
