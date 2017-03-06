#!/usr/bin/env bash

set -euo pipefail

APPDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"

RUN="${ECS_CONTAINER_PATH}/run"
TARGETS="${RUN}/targets.txt"


RATE=10
DURATION=10
NUMBER_OF_WORKERS=1

prepare() {
	rm -rf "$RUN"
	mkdir -p "$RUN"
	echo "rate: $RATE duration: $DURATION workers: $NUMBER_OF_WORKERS" >> "$RUN/shellLog.log"
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

generate_targets(){
	local number_of_requests
	local bodies
	number_of_requests=$((RATE*DURATION))
	bodies="${RUN}/bodies"

	mkdir -p "$bodies"

	for (( i=1; i<=number_of_requests; i++ ))
	do
		transfer_id=$(uuidgen)
		sed \
			-e "s|<LEDGER_URL>|$CLEDG_HOSTNAME|g" \
			-e "s|<TRANSFER_ID>|$transfer_id|g" \
			"${APPDIR}/prepare-transfer.json.template" > "${bodies}/body${i}.json"

		cat <<- EOF >> "$TARGETS"
		PUT $CLEDG_HOSTNAME/transfers/${transfer_id}
		@$bodies/body${i}.json
		EOF
	done
}

main(){
	prepare
	log_ulimits
	generate_targets
	vegeta attack -targets="$TARGETS" -workers=$NUMBER_OF_WORKERS -rate $RATE -duration ${DURATION}s > "${RUN}/results.bin"
	vegeta report -inputs="${RUN}/results.bin" -reporter=json > "${RUN}/metrics.json"
	vegeta report -inputs="${RUN}/results.bin" -reporter=text > "${RUN}/metrics.txt"
}

main "$@"
