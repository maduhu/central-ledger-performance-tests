import { assert } from 'chai';
import sinon from 'sinon';
import fs from 'fs';
import PrepareRequestBodyTemplate from '../PrepareRequestBodyTemplate';

describe('PrepareRequestBodyTemplate', function() {
  describe('create', function() {
    it('should fill out template', function() {
      const expectedTemplateFile = "<LEDGER_URL><TRANSFER_ID>";
      sinon.stub(fs, 'readFileSync').returns(expectedTemplateFile);

      const testName = "somePath";
      const expectedFilePath = `perf-test-scripts/${testName}/${testName}-exec.json.template`;

      const result = PrepareRequestBodyTemplate(fs, testName).create("a", "b");

      assert.isTrue(fs.readFileSync.calledWith(expectedFilePath, "utf8"));
      assert.equal(result, "ab");
    });
  });
});
