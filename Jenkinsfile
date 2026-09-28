pipeline {
    agent any
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }
    triggers {
        githubPush()
    }
    stages {
        stage('Scarica main') {
            steps {
                script {
                    def revision = checkout(scm)
                    env.GIT_COMMIT = revision.GIT_COMMIT
                }
                sh 'git log -1 --format="Commit: %h %s"'
            }
        }
        stage('Compila e aggiorna ORIO') {
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'orio-deploy-ssh', keyFileVariable: 'DEPLOY_KEY', usernameVariable: 'DEPLOY_USER'),
                    file(credentialsId: 'orio-deploy-known-hosts', variable: 'DEPLOY_KNOWN_HOSTS')
                ]) {
                    sh '''
                        set +x
                        ssh -i "$DEPLOY_KEY" \\
                            -o IdentitiesOnly=yes -o BatchMode=yes \\
                            -o StrictHostKeyChecking=yes \\
                            -o UserKnownHostsFile="$DEPLOY_KNOWN_HOSTS" \\
                            -o ConnectTimeout=15 -o ServerAliveInterval=30 \\
                            "$DEPLOY_USER@host.docker.internal" "deploy $GIT_COMMIT"
                    '''
                }
            }
        }
    }
    post {
        success { echo 'ORIO aggiornato e verificato. Database e salvataggi restano nel volume persistente.' }
        failure { echo 'Aggiornamento non riuscito: controllare il log. Nessun volume viene eliminato dal job.' }
    }
}
