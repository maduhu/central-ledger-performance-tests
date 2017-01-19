SHELL := /bin/bash
BUILD_DIR := build
PROFILER_DIR := prof
VIRTUALENV_DIR := $(BUILD_DIR)/venv
PYTHON := $(VIRTUALENV_DIR)/bin/python
PIP := $(VIRTUALENV_DIR)/bin/pip
ACTIVATE := ${VIRTUALENV_DIR}/bin/activate

all: lint test

lint: deps
	@PYFLAKES_NODOCTEST=1 ${VIRTUALENV_DIR}/bin/flake8 tests

test: deps
		. ${ACTIVATE} && py.test -rw tests/

test-loop: deps
		. ${ACTIVATE} && py.test -rw --looponfail tests/

test-profile: clean-profile
		. ${ACTIVATE} && py.test -rw --profile-svg tests/

clean-profile:
		rm -rf ${PROFILER_DIR}

clean: clean-profile
		find . -name "*.py[co]" -delete

venv: ${ACTIVATE}
${ACTIVATE}: requirements.txt
		test -d ${VIRTUALENV_DIR}/bin || virtualenv ${VIRTUALENV_DIR}

deps: requirements.txt venv
		${PIP} install --upgrade pip
		${PIP} install -r requirements.txt