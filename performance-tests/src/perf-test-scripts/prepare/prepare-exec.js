#!/usr/bin/env node

const Fs = require('fs');
const Shell = require('shelljs');
const PerformanceTestRequestBuilder = require('./PerformanceTestRequestBuilder');
const PrepareRequestBodyTemplate = require('../shared/PrepareRequestBodyTemplate')
const uuidV4 = require('uuid/v4');

const commandLineArguments = process.argv.slice(2);

//break down args
const testName = commandLineArguments[0];
const rate = parseInt(commandLineArguments[1], 10);
const duration = parseInt(commandLineArguments[2], 10);
const hostNameUrl = commandLineArguments[3];
const runPath = commandLineArguments[4];

let templateFile = `perf-test-scripts/shared/prepare-request.json.template`
let requestTemplate = PrepareRequestBodyTemplate(Fs, templateFile);

let builder = PerformanceTestRequestBuilder(Shell, Fs, uuidV4, requestTemplate);
let outputPath = `${runPath}/perf-test-scripts/${testName}`;
builder.build(rate, duration, hostNameUrl, outputPath);
