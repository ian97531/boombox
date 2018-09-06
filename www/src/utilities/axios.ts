import Axios from 'axios'
import * as queryString from 'query-string'

const API_PROD = 'api.'
const API_TEST = 'api-test.'
const API_ANDREW = 'api-andrew.'
const API_IAN = 'api-ian.'
const DOMAIN = 'boombox.bingo'

const params = queryString.parse(window.location.search)

const paramsApiHostMap = {
  andrew: API_ANDREW,
  ian: API_IAN,
  prod: API_PROD,
  test: API_TEST,
}

const originApiHostMap = {
  'boombox.bingo': API_PROD,
  'www-andrew.boombox.bingo': API_ANDREW,
  'www-ian.boombox.bingo': API_IAN,
  'www-test.boombox.bingo': API_TEST,
}

const defaultApiHost = API_TEST
const originApiHost = originApiHostMap[window.location.hostname]
const queryStringApiHost = params.api ? paramsApiHostMap[params.api] : undefined

// If the 'api' query string parameter is defined with one of the values
// in the paramsApiHostMap, use that value to determine the API
// host instead of the origin of the current page.
const apiHost = queryStringApiHost || originApiHost || defaultApiHost

export default Axios.create({
  baseURL: 'https://' + apiHost + DOMAIN + '/',
  timeout: 3000,
})
