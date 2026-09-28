pipeline {
  agent { label 'raspberry-pi && docker' }

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    skipDefaultCheckout(true)
  }

  environment {
    DEPLOY_DIRECTORY = '/home/elfo/services/orio'
  }

  stages {
    stage('Scarica main') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/main']],
          extensions: [[$class: 'CleanBeforeCheckout']],
          userRemoteConfigs: [[url: 'https://github.com/elfo399/Orio.git']]
        ])
      }
    }

    stage('Compila') {
      steps {
        withCredentials([string(credentialsId: 'orio-postgres-password', variable: 'ORIO_DB_PASSWORD')]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            install -d -m 0750 "$DEPLOY_DIRECTORY"

            # Create the deployment secret once; it is never committed to Git.
            if [ ! -f "$DEPLOY_DIRECTORY/.env" ]; then
              umask 077
              printf 'POSTGRES_DB=orio\nPOSTGRES_USER=orio\nPOSTGRES_PASSWORD=%s\nDATABASE_URL=postgres://orio:%s@db:5432/orio\nWEB_PORT=18080\n' \
                "$ORIO_DB_PASSWORD" "$ORIO_DB_PASSWORD" > "$DEPLOY_DIRECTORY/.env"
            fi

            docker compose --env-file "$DEPLOY_DIRECTORY/.env" -f compose.yaml build api web
          '''
        }
      }
    }

    stage('Aggiorna ORIO') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          docker compose --env-file "$DEPLOY_DIRECTORY/.env" -f compose.yaml up -d --no-build --remove-orphans
          docker compose --env-file "$DEPLOY_DIRECTORY/.env" -f compose.yaml ps
        '''
      }
    }
  }
}
