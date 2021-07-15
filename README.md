# cvs-tsk-scheduled-operations

## Introduction

A service for running tasks which need to happen periodically, triggered by Cloudwatch Events, rather than user operations.

////////

#### Run AWS Lambda node functions locally

- `npm install`
- `BRANCH=local npm start`

### Git Hooks

Please set up the following prepush git hook in .git/hooks/pre-push

```
#!/bin/sh
npm run prepush && git log -p | scanrepo

```

#### Security

Please install and run the following securiy programs as part of your testing process:

https://github.com/awslabs/git-secrets

- After installing, do a one-time set up with `git secrets --register-aws`. Run with `git secrets --scan`.

https://github.com/UKHomeOffice/repo-security-scanner

- After installing, run with `git log -p | scanrepo`.

These will be run as part of prepush so please make sure you set up the git hook above so you don't accidentally introduce any new security vulnerabilities.

### Testing

In order to test, you need to run the following:

- `npm run test` for unit tests
- `npm run test-i` for integration tests

### SonarQube

In order to generate SonarQube reports on local, follow the steps:

- Download SonarQube server -> https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-7.6.zip
- Download SonarQube scanner -> https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-3.3.0.1492-macosx.zip
- Add sonar-scanner in environment variables -> In .brash_profile add the line "export PATH=<PATH_TO_SONAR_SCANNER>/sonar-scanner-3.3.0.1492-macosx/bin:$PATH"
- Start the SonarQube server -> cd <PATH_TO_SONARQUBE_SERVER>/bin/macosx-universal-64 ./sonar.sh start
- In the microservice folder run the command -> npm run sonar-scanner

### Environmental variables

- The `BRANCH` environment variable indicates in which environment is this application running. Use `BRANCH=local` for local deployment. This variable is required when starting the application or running tests.

### Local Running

To run this locally, add the following environment variables to your run configuration(s):

- AWS_XRAY_CONTEXT_MISSING = LOG_ERROR
- SLS_DEBUG = \*
- BRANCH = LOCAL
