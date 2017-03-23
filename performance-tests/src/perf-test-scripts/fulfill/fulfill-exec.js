#!/usr/bin/env node

const Fs = require('fs');
const Shell = require('shelljs');
const FulFillRequestBuilder = require('./FulfillRequestBuilder');

const commandLineArguments = process.argv.slice(2);

//break down args
const testName = commandLineArguments[0];
const rate = parseInt(commandLineArguments[1], 10);
const duration = parseInt(commandLineArguments[2], 10);
const hostNameUrl = commandLineArguments[3];
const runPath = commandLineArguments[4];

const idsFile = `${runPath}/perf-test-scripts/${testName}/setup/ids.txt`;
const outputPath = `${runPath}/perf-test-scripts/${testName}`;
FulFillRequestBuilder(Shell, Fs, idsFile).build(rate, duration, hostNameUrl, outputPath);
