pipeline {
  agent { label 'raspberry-pi && docker' }

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    skipDefaultCheckout(true)
  }

  parameters {
    booleanParam(name: 'PUBLISH_IMAGES', defaultValue: false, description: 'Push immutable ARM64 images to the configured registry (main/tag builds only).')
    booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Deploy the selected images on this Pi (main branch only).')
    string(name: 'REGISTRY', defaultValue: 'ghcr.io', description: 'OCI registry hostname.')
    string(name: 'IMAGE_NAMESPACE', defaultValue: 'replace-me', description: 'Registry namespace, for example acme/orio.')
    string(name: 'IMAGE_TAG', defaultValue: '', description: 'Optional image tag. Empty uses build-<Jenkins build number>.')
    string(name: 'DEPLOY_DIRECTORY', defaultValue: '/opt/orio', description: 'Directory holding compose.prod.yaml and a manually managed .env.')
  }

  environment {
    CI_BUILDER_IMAGE = "orio-build-ci:${BUILD_NUMBER}"
    CI_E2E_IMAGE = "orio-e2e-ci:${BUILD_NUMBER}"
    CI_PROJECT = "orio-ci-${BUILD_NUMBER}"
    CI_WEB_PORT = "18080"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Preflight') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          test "$(uname -m)" = "aarch64" || { echo 'This Jenkinsfile is intended for an ARM64 Raspberry Pi agent.' >&2; exit 1; }
          docker version --format '{{.Server.Version}} / {{.Server.Arch}}'
          docker compose version
          docker buildx inspect --bootstrap >/dev/null
        '''
      }
    }

    stage('Quality') {
      steps {
        sh '''#!/usr/bin/env bash
          set -euo pipefail
          docker build --target build -t "$CI_BUILDER_IMAGE" .
          docker run --rm "$CI_BUILDER_IMAGE" sh -lc '
            pnpm lint &&
            pnpm typecheck &&
            pnpm test
          '
        '''
      }
    }

    stage('Integration and E2E') {
      steps {
        withCredentials([string(credentialsId: 'orio-postgres-password', variable: 'ORIO_DB_PASSWORD')]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            # Use a URL-safe random password in Jenkins credentials (letters, digits, _ and -).
            umask 077
            printf 'POSTGRES_DB=orio\nPOSTGRES_USER=orio\nPOSTGRES_PASSWORD=%s\nDATABASE_URL=postgres://orio:%s@db:5432/orio\nWEB_PORT=%s\n' "$ORIO_DB_PASSWORD" "$ORIO_DB_PASSWORD" "$CI_WEB_PORT" > .env
            export ORIO_DB_VOLUME="${CI_PROJECT}-postgres"

            docker compose -p "$CI_PROJECT" -f compose.yaml -f compose.ci.yaml up --build -d
            for attempt in $(seq 1 30); do
              if docker compose -p "$CI_PROJECT" -f compose.yaml -f compose.ci.yaml exec -T api node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
                break
              fi
              test "$attempt" -lt 30 || { docker compose -p "$CI_PROJECT" -f compose.yaml -f compose.ci.yaml logs; exit 1; }
              sleep 2
            done

            docker run --rm --network "${CI_PROJECT}_default" \
              -e TEST_DATABASE_URL="postgres://orio:${ORIO_DB_PASSWORD}@db:5432/orio" \
              "$CI_BUILDER_IMAGE" pnpm test:integration

            docker build --target e2e -t "$CI_E2E_IMAGE" .
            docker run --rm --ipc=host --network "${CI_PROJECT}_default" \
              -e E2E_BASE_URL=http://web "$CI_E2E_IMAGE"
          '''
        }
      }
    }

    stage('Build and publish ARM64 images') {
      when {
        beforeAgent true
        expression { params.PUBLISH_IMAGES && (env.BRANCH_NAME == 'main' || env.TAG_NAME) }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'orio-registry', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_TOKEN')]) {
          script {
            env.RELEASE_TAG = params.IMAGE_TAG?.trim() ? params.IMAGE_TAG.trim() : "build-${env.BUILD_NUMBER}"
            env.API_IMAGE = "${params.REGISTRY}/${params.IMAGE_NAMESPACE}/orio-api:${env.RELEASE_TAG}"
            env.WEB_IMAGE = "${params.REGISTRY}/${params.IMAGE_NAMESPACE}/orio-web:${env.RELEASE_TAG}"
          }
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            test "${IMAGE_NAMESPACE}" != 'replace-me' || { echo 'Set IMAGE_NAMESPACE before publishing.' >&2; exit 1; }
            printf '%s' "$REGISTRY_TOKEN" | docker login "$REGISTRY" --username "$REGISTRY_USER" --password-stdin
            docker buildx build --platform linux/arm64 --target api --tag "$API_IMAGE" --push .
            docker buildx build --platform linux/arm64 --target web --tag "$WEB_IMAGE" --push .
            docker logout "$REGISTRY"
          '''
        }
      }
    }

    stage('Deploy on this Raspberry Pi') {
      when {
        beforeAgent true
        allOf {
          branch 'main'
          expression { params.DEPLOY }
        }
      }
      steps {
        script {
          env.RELEASE_TAG = params.IMAGE_TAG?.trim() ? params.IMAGE_TAG.trim() : "build-${env.BUILD_NUMBER}"
          env.API_IMAGE = "${params.REGISTRY}/${params.IMAGE_NAMESPACE}/orio-api:${env.RELEASE_TAG}"
          env.WEB_IMAGE = "${params.REGISTRY}/${params.IMAGE_NAMESPACE}/orio-web:${env.RELEASE_TAG}"
        }
        withCredentials([usernamePassword(credentialsId: 'orio-registry', usernameVariable: 'REGISTRY_USER', passwordVariable: 'REGISTRY_TOKEN')]) {
          sh '''#!/usr/bin/env bash
            set -euo pipefail
            test "${IMAGE_NAMESPACE}" != 'replace-me' || { echo 'Set IMAGE_NAMESPACE before deploying.' >&2; exit 1; }
            test -f "${DEPLOY_DIRECTORY}/.env" || { echo "Create ${DEPLOY_DIRECTORY}/.env from .env.example first." >&2; exit 1; }
            install -d -m 0750 "$DEPLOY_DIRECTORY"
            install -m 0644 compose.prod.yaml "$DEPLOY_DIRECTORY/compose.prod.yaml"
            export ORIO_API_IMAGE="$API_IMAGE"
            export ORIO_WEB_IMAGE="$WEB_IMAGE"
            printf '%s' "$REGISTRY_TOKEN" | docker login "$REGISTRY" --username "$REGISTRY_USER" --password-stdin
            docker compose --env-file "${DEPLOY_DIRECTORY}/.env" -f "${DEPLOY_DIRECTORY}/compose.prod.yaml" pull
            docker compose --env-file "${DEPLOY_DIRECTORY}/.env" -f "${DEPLOY_DIRECTORY}/compose.prod.yaml" up -d
            docker compose --env-file "${DEPLOY_DIRECTORY}/.env" -f "${DEPLOY_DIRECTORY}/compose.prod.yaml" ps
            docker logout "$REGISTRY"
          '''
        }
      }
    }
  }

  post {
    always {
      sh '''#!/usr/bin/env bash
        set +e
        export ORIO_DB_VOLUME="${CI_PROJECT}-postgres"
        docker compose -p "$CI_PROJECT" -f compose.yaml -f compose.ci.yaml down -v --remove-orphans
        rm -f .env
      '''
      junit allowEmptyResults: true, testResults: 'test-results/**/*.xml'
      archiveArtifacts allowEmptyArchive: true, artifacts: 'playwright-report/**,test-results/**'
    }
  }
}
