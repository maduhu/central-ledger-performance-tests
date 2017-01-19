from troposphere import Template

from stack.ECSCluster import ECSCluster
from stack.CentralServicesVPC import CentralServicesVPC
from stack.ECSLoadBalancer import ECSLoadBalancer
from stack.EC2ContainerInstance import EC2ContainerInstance
from stack.EC2ContainerInstanceRole import EC2ContainerInstanceRole
from stack.ECSAutoScalingGroup import ECSAutoScalingGroup

class CentralLedgerStack(object):
    def __init__(self, args):

        self.instance_type = args['instance_type']
        self.template = Template()
        self.stack_name = "centralLedgerStack" #TODO: make usable stack name include env
        self.environment = "perf"
        self.template.add_version('2010-09-09')
        self.template.add_description('%s stack for %s' % (self.stack_name, self.environment))


        #This createds a VPC. We probably just need to look up our existing one.
        vpc = CentralServicesVPC("CentralServicesVPC", self.template)

        ecs_cluster = ECSCluster("CentralServicesCluster", self.template).cluster
        ecs_loadbalancer = ECSLoadBalancer("CentralServicesClusterLoadBalancer", self.template, vpc).load_balancer

        #Lookup Existing Container Repository for central-ledger
        central_ledger_container_repo_uri = '886403637725.dkr.ecr.us-west-2.amazonaws.com/leveloneproject/central-ledger'

        # s3_assets_bucket = S3Assets()

        container_instance_role = EC2ContainerInstanceRole(self.template).container_instance_role
        container_instance = EC2ContainerInstance(self.template)
        #We may need to create a new one for our perf environment elsewhere and then look it up here as well
        auto_scaling_group = ECSAutoScalingGroup(self.template, vpc, container_instance_role, ecs_cluster, ecs_loadbalancer)

        #Deploy CentralLedgerContainer to ECS Cluster

    def to_json(self):
        return self.template.to_json()

