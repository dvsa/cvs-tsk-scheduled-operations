export enum TIMES {
  NOTIFICATION_TIME = 3,
  TERMINATION_TIME = 4,
  ADDITIONAL_WINDOW = 2,
}

export enum HTTPRESPONSE {
  NOT_VALID_JSON = "Invalid JSON",
  NOTHING_TO_DO = "No stale visits found. Nothing to act on.",
  SUCCESS = "Cleanup Success",
}

export enum ERRORS {
  NO_BRANCH = "'BRANCH' environment variable not found",
  NOTIFY_CONFIG_NOT_DEFINED = "The Notify config is not defined in the config file.",
  SECRET_ENV_VAR_NOT_SET = "SECRET_NAME environment variable not set.",
  SECRET_STRING_EMPTY = "SecretString is empty.",
  GET_ACIVITY_FAILURE = "Get Activities encountered errors",
  END_ACIVITY_FAILURE = "Ending activities encountered failures",
}

export enum TEMPLATE_IDS {
  TESTER_VISIT_EXPIRY = "72eac307-d001-4b13-9fde-9f26c631da68",
}
