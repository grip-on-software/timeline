pipeline {
    agent { label 'docker' }

    environment {
        GITLAB_TOKEN = credentials('timeline-gitlab-token')
    }

    options {
        gitLabConnection('gitlab')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    triggers {
        gitlab(triggerOnPush: true, triggerOnMergeRequest: true, branchFilterType: 'All', secretToken: env.GITLAB_TOKEN)
        cron('H 8-18 * * 1-5')
    }

    post {
        success {
            publishHTML([allowMissing: false, alwaysLinkToLastBuild: false, keepAll: false, reportDir: 'public', reportFiles: 'index.html', reportName: 'Visualization', reportTitles: ''])
            updateGitlabCommitStatus name: env.JOB_NAME, state: 'success'
        }
        failure {
            updateGitlabCommitStatus name: env.JOB_NAME, state: 'failed'
        }
        aborted {
            updateGitlabCommitStatus name: env.JOB_NAME, state: 'canceled'
        }
    }

    stages {
        stage('Build') {
            steps {
                updateGitlabCommitStatus name: env.JOB_NAME, state: 'running'
                sh 'docker build -t $DOCKER_REGISTRY/gros-timeline .'
            }
        }
        stage('Push') {
            when { branch 'master' }
            steps {
                sh 'docker push $DOCKER_REGISTRY/gros-timeline:latest'
            }
        }
        stage('Collect') {
            agent {
                docker {
                    image '$DOCKER_REGISTRY/gros-data-analysis-dashboard'
                    reuseNode true
                }
            }
            steps {
                withCredentials([file(credentialsId: 'data-analysis-config', variable: 'ANALYSIS_CONFIGURATION')]) {
                    sh '/bin/bash -c "rm -rf $PWD/output && mkdir $PWD/output && cd /home/docker && Rscript timeline.r $REPORT_PARAMS --log INFO --config $ANALYSIS_CONFIGURATION --output $PWD/output && Rscript report.r --report sprint_burndown --format json $REPORT_PARAMS --log INFO --config $ANALYSIS_CONFIGURATION --output $PWD/output"'
                }
            }
        }
        stage('Visualize') {
            agent {
                docker {
                    image '$DOCKER_REGISTRY/gros-timeline'
                    reuseNode true
                }
            }
            steps {
                sh 'rm -rf data/'
                sh 'mv output/ data/'
                sh 'rm -rf node_modules/'
                sh 'ln -s /usr/src/app/node_modules .'
                sh 'make build'
            }
        }
    }
}
