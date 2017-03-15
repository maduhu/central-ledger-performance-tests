#!/usr/bin/env bash

set -euo pipefail

APPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

NOW=$(date +"%Y_%m_%d_%H_%M_%S")
RUN="$ECS_CONTAINER_PATH/run"
TARGETS="$RUN/targets.txt"
APPLOG="$RUN/shellLog.log"

NUMBER_OF_WORKERS=1

log(){
	local timestamp=$(date +"%Y_%m_%d_%H_%M_%S.%N")
	echo "[$timestamp] $1" >> $APPLOG
}

prepare() {
	rm -rf "$RUN"
	mkdir -p "$RUN"
}

log_ulimits(){
	{
		echo "Printing defined ulimits"
		printf "%s\n" "* soft nofile $(ulimit -Sn)"
		printf "%s\n" "* hard nofile $(ulimit -Hn)"
		printf "%s\n" "* soft noproc $(ulimit -Su)"
		printf "%s\n" "* hard noproc $(ulimit -Hu)"
	} > "${RUN}/log"
}

run_setup_requests() {
	local test_name=$1
	log "Run $test_name-setup.js $test_name $CLEDG_HOSTNAME"
	if [[ -x "perf-test-scripts/$test_name/$test_name-setup.js" ]];
	then
		node "perf-test-scripts/$test_name/$test_name-setup.js" $test_name $CLEDG_HOSTNAME
	fi
}

generate_targets(){
	local test_name=$1
	local rate=$2
	local duration=$3
	log "Run $test_name-exec.js $test_name $rate $duration $CLEDG_HOSTNAME"
	node "perf-test-scripts/$test_name/$test_name-exec.js" $test_name $rate $duration $CLEDG_HOSTNAME $RUN
	log "Targets Generated"
}

report_results(){
	local output_path=$1
	local results_path=$2
	local rate=$3
	local duration=$4
	vegeta report -inputs="${output_path}/results.bin" -reporter=json > "${results_path}/metrics_rate${rate}_dur${duration}.json"
	log "JSON Report Complete"
	vegeta report -inputs="${output_path}/results.bin" -reporter=text > "${results_path}/metrics_rate${rate}_dur${duration}.txt"
	log "TXT Report Complete"
	vegeta report -inputs="${output_path}/results.bin" -reporter=plot > "${results_path}/metrics_rate${rate}_dur${duration}.html"
	log "HTML(Graph) Report Complete"
}

main(){
	prepare
	log "Begin Performance Test script."
	TEST_NAME=$1
	RATE=${2:-10}
	DURATION=${3:-3}
	log "rate: $RATE duration: $DURATION workers: $NUMBER_OF_WORKERS"
	log_ulimits

	run_setup_requests $TEST_NAME
	generate_targets $TEST_NAME $RATE $DURATION

	OUTPUT_PATH="$RUN/perf-test-scenarios/$TEST_NAME"
	RESULTS_PATH="$OUTPUT_PATH/results"
	mkdir $RESULTS_PATH
	vegeta attack -targets="$OUTPUT_PATH/targets.txt" -workers=$NUMBER_OF_WORKERS -rate $RATE -duration ${DURATION}s > "${OUTPUT_PATH}/results.bin"
  log "Test Complete"

	report_results $OUTPUT_PATH $RESULTS_PATH $RATE $DURATION
}

main "$@"
