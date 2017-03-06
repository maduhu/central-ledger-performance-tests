#!/usr/bin/env bash
#
# Run performance tests against central-ledger
#
# USAGE:
# bash run.sh
#
# Environment variables:
# PERF_AWS_REGION: [String] The AWS region where the tests are run
#                  (default: eu-central-1)
# PERF_STACK_NAME: [String] Name of the AWS Cloudformation stack where the tests
#                  are run
#                  (default: central-ledger-perf)
# PERF_EC2_KEY_PAIR_NAME: [String] Declares the AWS EC2 key pair name used when
#                         creating the stack
# PERF_EC2_KEY_PAIR: [String] Declares the location of the AWS EC2 key pair file
#                    specified for PERF_EC2_KEY_PAIR_NAME
# PERF_CENTRAL_LEDGER_IMAGE_VERSION: [String] The version of central-ledger to
#                                    run tests against
#                                    (default: 1.52.0)
# LEVELONE_DOCKER_REPO: [String] The URL of the LevelOne Docker repository
#                       (default: modusbox-level1-docker-release.jfrog.io)
# LEVELONE_DOCKER_USER: [String] Declares the username of the LevelOne Docker
#                       repository specified in LEVELONE_DOCKER_REPO
# LEVELONE_DOCKER_PASS: [String] Declares the password of the LevelOne Docker
#                       repository specified in LEVELONE_DOCKER_REPO
set -euo pipefail

PERF_AWS_REGION=${PERF_AWS_REGION:=us-east-1}
PERF_STACK_NAME=${PERF_STACK_NAME:=central-ledger-perf}
PERF_EC2_KEY_PAIR_NAME=${PERF_EC2_KEY_PAIR_NAME:-}
PERF_EC2_KEY_PAIR=${PERF_EC2_KEY_PAIR:-}
PERF_CENTRAL_LEDGER_IMAGE_VERSION=${PERF_CENTRAL_LEDGER_IMAGE_VERSION:=v1.60.0}
LEVELONE_DOCKER_REPO=${LEVELONE_DOCKER_REPO:=modusbox-level1-docker-release.jfrog.io}
LEVELONE_DOCKER_USER=${LEVELONE_DOCKER_USER:-}
LEVELONE_DOCKER_PASS=${LEVELONE_DOCKER_PASS:-}

APPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

AWS="aws --region ${PERF_AWS_REGION} --output json"
JQ="jq --raw-output --exit-status"

STACK_CONFIG="${APPDIR}/stack/stack.template.json"
STACK_LAUNCH_PARAMS_TEMPLATE="${APPDIR}/stack/launch-params.json.template"
EB_DOCKERRUN_AWS_TEMPLATE="${APPDIR}/stack/eb/Dockerrun.aws.json.template"
ECS_TASK_DEFINITION_TEMPLATE="${APPDIR}/stack/ecs/task-definition.json.template"
ECS_VOLUME_HOST_PATH="/ecs/perfdata"
ECS_CONTAINER_PATH="/var/perfdata"

PERF_TEST_BUCKET="$PERF_STACK_NAME"
TEST_CONFIG_FOLDER="test_config"
TEST_CONFIG_FILE="perf-test-conf.properties"

TESTS="${APPDIR}/performance-tests"
TESTS_IMAGE_VERSION=v1.0.0
TESTS_LOG=$ECS_VOLUME_HOST_PATH/run/log
TESTS_METRICS=$ECS_VOLUME_HOST_PATH/run/metrics.json
TESTS_METRICS_TEXT=$ECS_VOLUME_HOST_PATH/run/metrics.txt
TESTS_BODIES=$ECS_VOLUME_HOST_PATH/run/bodies
TESTS_RESULTS_BIN=$ECS_VOLUME_HOST_PATH/run/results.bin
TESTS_TARGETS=$ECS_VOLUME_HOST_PATH/run/targets.txt
TESTS_SHELLLOG=$ECS_VOLUME_HOST_PATH/run/shellLog.log

RUN="${APPDIR}/run"

e_ok() { printf "  ✔  %s\n" "$@" ;}
e_info() { printf "  ➜  %s\n" "$@" ;}
e_error() { printf "  ✖  %s\n" "$@" ;}
e_warn() { printf "    %s\n" "$@" ;}
e_abort() { e_error "$1"; return "${2:-1}" ;}
e_finish() { e_ok "Finished at $(/bin/date "+%F %T")"; }

is_cmd() { command -v "$@" >/dev/null 2>&1 ;}

sanity_checks(){
  is_cmd aws || e_abort 'aws not found. Please install and run the script again'
  is_cmd jq || e_abort 'jq not found. Please install and run the script again'
}

clean(){
    e_info 'Cleaning'
    rm -rf "$RUN"
}

prepare(){
    e_info "Preparing environment for run"
    e_info "Creating 'run' directory. All generated files will be placed here: '${RUN}'"
    mkdir -p "$RUN"
}

create_launch_params_file(){
    e_info 'Creating launch-params.json file'
    sed \
        -e "s|<EC2_KEY_PAIR_NAME>|$PERF_EC2_KEY_PAIR_NAME|g" \
        "${STACK_LAUNCH_PARAMS_TEMPLATE}" > "${RUN}/launch-params.json"
}

create_stack(){
    e_info "Creating stack"
    aws cloudformation create-stack --stack-name $PERF_STACK_NAME --region $PERF_AWS_REGION \
        --template-body "file://${STACK_CONFIG}" \
        --parameters "file://${RUN}/launch-params.json" \
        --capabilities CAPABILITY_IAM
}

wait_for_stack_completion(){
    local status='UNKNOWN_IN_PROGRESS'

    e_info "Waiting for stack to complete ..."
    until [[ $status =~ _(COMPLETE|FAILED)$ ]]; do
        status="$($AWS cloudformation describe-stacks --stack-name $PERF_STACK_NAME | $JQ '.Stacks[0].StackStatus')"
        e_info " ... $PERF_STACK_NAME - $status"
        sleep 5
    done

    echo "$status"

    # if status is failed or we'd rolled back, assume bad things happened
    if [[ $status =~ _FAILED$ ]] || [[ $status =~ ROLLBACK ]]; then
        return 1
    fi
}

get_central_ledger_ecr(){
    $AWS ecr describe-repositories | $JQ '.repositories[] | select(.repositoryName == "'"$PERF_STACK_NAME-central-ledger"'") | .repositoryUri'
}

get_performance_tests_ecr(){
    $AWS ecr describe-repositories | $JQ '.repositories[] | select(.repositoryName == "'"$PERF_STACK_NAME-performance-tests"'") | .repositoryUri'
}

push_central_ledger_image_to_stack(){
    local ecr_repository_uri

    ecr_repository_uri="$(get_central_ledger_ecr)"

    e_info "Pulling Central-ledger image from $LEVELONE_DOCKER_REPO/central-ledger:$PERF_CENTRAL_LEDGER_IMAGE_VERSION"
    docker login -u "$LEVELONE_DOCKER_USER" -p "$LEVELONE_DOCKER_PASS" $LEVELONE_DOCKER_REPO
    docker pull "$LEVELONE_DOCKER_REPO/leveloneproject/central-ledger:$PERF_CENTRAL_LEDGER_IMAGE_VERSION"

    e_info "Pushing Central-ledger image to ECR"
    eval "$($AWS ecr get-login --region $PERF_AWS_REGION)"
    docker tag $LEVELONE_DOCKER_REPO/leveloneproject/central-ledger:$PERF_CENTRAL_LEDGER_IMAGE_VERSION "${ecr_repository_uri}:$PERF_CENTRAL_LEDGER_IMAGE_VERSION"
    docker push "$ecr_repository_uri:$PERF_CENTRAL_LEDGER_IMAGE_VERSION"
}

push_performance_tests_image_to_stack(){
    local ecr_repository_uri

    ecr_repository_uri="$(get_performance_tests_ecr)"

    e_info "Building Performance Tests image"

    docker build --no-cache "${TESTS}" -t leveloneproject/central-ledger-performance-tests:$TESTS_IMAGE_VERSION

    e_info "Pushing Performance Tests image to ECR"
    eval "$($AWS ecr get-login --region $PERF_AWS_REGION)"
    docker tag leveloneproject/central-ledger-performance-tests:$TESTS_IMAGE_VERSION "${ecr_repository_uri}:$TESTS_IMAGE_VERSION"
    docker push "$ecr_repository_uri:$TESTS_IMAGE_VERSION"
}

create_dockerrun_file(){
    local ecr_repository_uri

    ecr_repository_uri="$(get_central_ledger_ecr)"

    e_info 'Creating Dockerrun.aws.json file'
    sed \
        -e "s|<DOCKER_IMAGE>|$ecr_repository_uri:$PERF_CENTRAL_LEDGER_IMAGE_VERSION|g" \
        "$EB_DOCKERRUN_AWS_TEMPLATE" > "${RUN}/Dockerrun.aws.json"
}

create_task_definition_file(){
    local ecr_repository_uri
    local elastic_beanstalk_application_name
    local elastic_beanstalk_application_cname

    ecr_repository_uri="$(get_performance_tests_ecr)"
    elastic_beanstalk_application_name=$($AWS cloudformation describe-stack-resources --stack-name $PERF_STACK_NAME | $JQ '.StackResources[] | select(.ResourceType == "AWS::ElasticBeanstalk::Application") | .PhysicalResourceId')
    elastic_beanstalk_application_cname=$($AWS elasticbeanstalk describe-environments | $JQ '.Environments[] | select(.ApplicationName == "'"$elastic_beanstalk_application_name"'") | .CNAME')

    e_info 'Creating task-definition.json file'
    sed \
        -e "s|<DOCKER_IMAGE>|$ecr_repository_uri:$TESTS_IMAGE_VERSION|g" \
        -e "s|<HOSTNAME>|http://$elastic_beanstalk_application_cname|g" \
        -e "s|<ECS_VOLUME_HOST_PATH>|$ECS_VOLUME_HOST_PATH|g" \
        -e "s|<ECS_CONTAINER_PATH>|$ECS_CONTAINER_PATH|g" \
        "${ECS_TASK_DEFINITION_TEMPLATE}" > "${RUN}/task-definition.json"
}

run_performance_tests(){
    local elastic_beanstalk_application_name
    local elastic_beanstalk_environment_id
    local elastic_beanstalk_environment_name
    local cluster
    local latest_revision
    local run_task
    local task_id
    local container_instance_id
    local ec2_instance
    local ec2_ip

    elastic_beanstalk_application_name=$($AWS cloudformation describe-stack-resources --stack-name $PERF_STACK_NAME | $JQ '.StackResources[] | select(.ResourceType == "AWS::ElasticBeanstalk::Application") | .PhysicalResourceId')
    elastic_beanstalk_environment_id=$($AWS elasticbeanstalk describe-environments | $JQ '.Environments[] | select(.ApplicationName == "'"$elastic_beanstalk_application_name"'") | .EnvironmentId')
    elastic_beanstalk_environment_name=$($AWS elasticbeanstalk describe-environments | $JQ '.Environments[] | select(.ApplicationName == "'"$elastic_beanstalk_application_name"'") | .EnvironmentName')
    cluster="awseb-${elastic_beanstalk_environment_name}-${elastic_beanstalk_environment_id:2}"

    e_info 'Running performance tests'
    latest_revision=$($AWS ecs register-task-definition --cli-input-json "file://${RUN}/task-definition.json" | $JQ '.taskDefinition.revision') # side-effect causing

    run_task=$($AWS ecs run-task --task-definition "central-ledger-performance-tests-family:$latest_revision" --count 1 --cluster "$cluster" | $JQ '.tasks[0]') # side-effect causing
    task_id=$(echo "$run_task" | $JQ '.taskArn')
    container_instance_id=$(echo "$run_task" | $JQ '.containerInstanceArn')
    ec2_instance=$($AWS ecs describe-container-instances --cluster="$cluster" --container-instances "$container_instance_id" | $JQ '.containerInstances[0].ec2InstanceId')
    ec2_ip=$($AWS ec2 describe-instances --instance-ids "$ec2_instance" | $JQ '.Reservations[0].Instances[0].PublicIpAddress')

    e_info "Waiting for performance tests to complete ..."
    $AWS ecs wait tasks-stopped --tasks "$task_id" --cluster "$cluster"

    e_info "About to copy some files from $ec2_ip to local"
    NOW=$(date +"%Y_%m_%d_%H_%M_%S")

    e_info "Writing performance test logs to '${RUN}/performance-tests.log'"
    scp -o "StrictHostKeyChecking no" -i "$PERF_EC2_KEY_PAIR" ec2-user@"$ec2_ip:$TESTS_LOG" "${RUN}/performance-tests.log"
    e_info "Writing performance test metrics to '${RUN}/performance-tests-metrics.json'"
    scp -o "StrictHostKeyChecking no" -i "$PERF_EC2_KEY_PAIR" ec2-user@"$ec2_ip:$TESTS_METRICS" "${RUN}/results-$NOW.json"
    e_info "Writing performance test metrics to '${RUN}/performance-tests-metrics.txt'"
    scp -o "StrictHostKeyChecking no" -i "$PERF_EC2_KEY_PAIR" ec2-user@"$ec2_ip:$TESTS_METRICS_TEXT" "${RUN}/results-$NOW.txt"

    #e_info "Copy out bodies files"
    #scp -r -o "StrictHostKeyChecking no" -i "$PERF_EC2_KEY_PAIR" ec2-user@"$ec2_ip:$TESTS_BODIES" "${RUN}/bodies"

    e_info "Copy out a single body file"
    scp -o "StrictHostKeyChecking no" -i "$PERF_EC2_KEY_PAIR" ec2-user@"$ec2_ip:$TESTS_BODIES/body1.json" "${RUN}/body1.json"

    e_info "Writing performance test raw result file to '${RUN}/results.bin'"
    scp -o "StrictHostKeyChecking no" -i "$PERF_EC2_KEY_PAIR" ec2-user@"$ec2_ip:$TESTS_RESULTS_BIN" "${RUN}/results.bin"

    e_info "Writing performance test targets file to '${RUN}/targets.txt'"
    scp -o "StrictHostKeyChecking no" -i "$PERF_EC2_KEY_PAIR" ec2-user@"$ec2_ip:$TESTS_TARGETS" "${RUN}/targets.txt"

    e_info "Writing performance test shell logs to '${RUN}/shellLog.log'"
    scp -o "StrictHostKeyChecking no" -i "$PERF_EC2_KEY_PAIR" ec2-user@"$ec2_ip:$TESTS_SHELLLOG" "${RUN}/shellLog.log"
}

deploy_central_ledger_to_stack(){
    local elastic_beanstalk_environment_id
    local elastic_beanstalk_application_name
    local elastic_beanstalk_application_cname
    local elastic_beanstalk_storage
    local version_label

    elastic_beanstalk_application_name=$($AWS cloudformation describe-stack-resources --stack-name $PERF_STACK_NAME | $JQ '.StackResources[] | select(.ResourceType == "AWS::ElasticBeanstalk::Application") | .PhysicalResourceId')
    elastic_beanstalk_application_cname=$($AWS elasticbeanstalk describe-environments | $JQ '.Environments[] | select(.ApplicationName == "'"$elastic_beanstalk_application_name"'") | .CNAME')
    elastic_beanstalk_environment_id=$($AWS elasticbeanstalk describe-environments | $JQ '.Environments[] | select(.ApplicationName == "'"$elastic_beanstalk_application_name"'") | .EnvironmentId')
    elastic_beanstalk_storage=$($AWS elasticbeanstalk create-storage-location | $JQ '.S3Bucket')
    version_label=$( (cat "${RUN}/Dockerrun.aws.json" ; echo $PERF_CENTRAL_LEDGER_IMAGE_VERSION) | shasum -a 1 | awk '{print $1}' )

    e_info 'Deploying Central Ledger to stack'
    e_info "$elastic_beanstalk_application_cname"

    $AWS s3 cp "${RUN}/Dockerrun.aws.json" "s3://$elastic_beanstalk_storage/Dockerrun.aws.json"

    $AWS elasticbeanstalk create-application-version \
        --application-name "$elastic_beanstalk_application_name" \
        --version-label "$version_label" \
        --source-bundle S3Bucket="$elastic_beanstalk_storage,S3Key=Dockerrun.aws.json"

    $AWS elasticbeanstalk update-environment \
        --environment-id "$elastic_beanstalk_environment_id" \
        --version-label "$version_label" \
        --option-settings "Namespace=aws:elasticbeanstalk:application:environment,OptionName=CLEDG_HOSTNAME,Value=http://${elastic_beanstalk_application_cname}"
}

delete_stack() {
    e_info "Deleting stack"
    $AWS cloudformation delete-stack --stack-name $PERF_STACK_NAME
}

wait_for_stack_deletion(){
    local status='UNKNOWN_IN_PROGRESS'

    e_info "Waiting for stack to delete ..." >&2
    until [[ $status == 'DELETED' ]]; do
        status="$( ($AWS cloudformation describe-stacks --stack-name $PERF_STACK_NAME | $JQ '.Stacks[0].StackStatus') || echo 'DELETED')"
        e_info " ... $PERF_STACK_NAME - $status"
        sleep 5
    done

    echo "$status"

    # if status is failed or we'd rolled back, assume bad things happened
    if [[ $status =~ _FAILED$ ]] || [[ $status =~ ROLLBACK ]]; then
        return 1
    fi
}

force_delete_stack(){
    e_info "Force deleting ECR repositories"
    $AWS ecr delete-repository --repository-name $PERF_STACK_NAME-central-ledger --force
    $AWS ecr delete-repository --repository-name $PERF_STACK_NAME-performance-tests --force

    delete_stack
    wait_for_stack_deletion
}

main(){
    e_info "AWS Region: '${PERF_AWS_REGION}'"
    e_info "Stack Name: '${PERF_STACK_NAME}'"
    e_info "Central-ledger Image Version: '${PERF_CENTRAL_LEDGER_IMAGE_VERSION}'"
    e_info "EC2 Key Pair Name: '${PERF_EC2_KEY_PAIR_NAME}'"
    e_info "EC2 Key Pair: '${PERF_EC2_KEY_PAIR}'"

    #Build AWS Infrastructure
    clean
    prepare
    sanity_checks
    create_launch_params_file
    create_stack
    wait_for_stack_completion

    #Deploy Central Ledger
    push_central_ledger_image_to_stack
    create_dockerrun_file
    deploy_central_ledger_to_stack

    #Deploy PerformanceTestingImageAndTaskDef
    push_performance_tests_image_to_stack
    create_task_definition_file

    #Excecute the Performance tests defined in the performance tests stack.
    run_performance_tests

    force_delete_stack
    e_finish
}

main "$@"
