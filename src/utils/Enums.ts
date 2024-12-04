export enum TIMES {
  NOTIFICATION_TIME = 3,
  TERMINATION_TIME = 4,
  ADDITIONAL_WINDOW = 2,
}

export enum HTTPRESPONSE {
  NOT_VALID_JSON = 'Invalid JSON',
  NOTHING_TO_DO = 'No stale visits found. Nothing to act on.',
  SUCCESS = 'Cleanup Success',
}

export enum ERRORS {
  NOTIFY_CONFIG_NOT_DEFINED = 'The Notify config is not defined in the config file.',
  TEMPLATE_ID_ENV_VAR_NOT_EXIST = 'TEMPLATE_ID environment variable does not exist.',
  SECRET_ENV_VAR_NOT_SET = 'SECRET_NAME environment variable not set.',
  SECRET_STRING_EMPTY = 'SecretString is empty.',
  END_ACTIVITY_FAILURE = 'Ending activities encountered failures',
}

export enum LOG_REASONS {
  VISIT_WITHIN_3_HOURS = 'Visit under 3 hours',
  LAST_ACTION_UNDER_3_HOURS = 'Last action time under 3 hours ago',
  LAST_ACTION_OVER_3_HOURS = 'Last action time more than 3 hours ago',
  LAST_ACTION_OVER_4_HOURS = 'Last action time more than 4 hours ago',
}

export enum LOG_STATUS {
  NO_ACTION = 'No action',
  NOTIFY_OK = 'Notification email sent',
  NOTIFY_FAIL = 'Notification email failed to send',
  CLOSED_OK = 'Closed',
  CLOSED_FAIL = 'Failed to close',
}

export enum LOG_ACTIONS {
  NO_ACTION = 'NO ACTION',
  NOTIFY = 'NOTIFY',
  CLOSE = 'CLOSE',
}
