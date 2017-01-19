#!/usr/bin/env python
import argparse

from stack.CentralLedgerStack import CentralLedgerStack

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('-i', '--instance-type', default='m3.medium')
    args2 = parser.parse_args()
    return vars(args2)


def convertStackToCloudFormationTemplate(stack):
    cf_template_json = stack.to_json()
    print cf_template_json
    return cf_template_json


the_args = parse_args()
stack = CentralLedgerStack(the_args)
cfn_template = convertStackToCloudFormationTemplate(stack)