import { ENV as LAMBDA_ENV } from '../lambda/constants'

export class ENV extends LAMBDA_ENV {
  public static readonly JOBS_LOG_GROUP = 'JOBS_LOG_GROUP'
  public static readonly JOBS_TABLE = 'JOBS_TABLE'
}
