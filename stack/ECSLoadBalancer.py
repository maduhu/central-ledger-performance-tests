from troposphere import (
    elasticloadbalancing as elb,
    GetAtt,
    Join,
    Output,
    Parameter,
    Ref,
)

from troposphere.ec2 import (
    SecurityGroup,
    SecurityGroupRule,
)

#TODO: Handle SSL Certificate Parameter
class ECSLoadBalancer(object):
    def __init__(self, name, template, vpcWrapper):
        vpc = vpcWrapper.vpc
        loadbalancer_a_subnet = vpcWrapper.loadbalancer_a_subnet
        loadbalancer_b_subnet = vpcWrapper.loadbalancer_b_subnet

        certificate_id = Ref(template.add_parameter(Parameter(
            "CertId",
            Description="Web SSL certificate id",
            Type="String",
        )))

        web_worker_port = Ref(template.add_parameter(Parameter(
            "WebWorkerPort",
            Description="Web worker container exposed port",
            Type="Number",
            Default="8000",
        )))

        # Web load balancer
        load_balancer_security_group = SecurityGroup(
            "LoadBalancerSecurityGroup",
            template=template,
            GroupDescription="Web load balancer security group.",
            VpcId=Ref(vpc),
            SecurityGroupIngress=[
                SecurityGroupRule(
                    IpProtocol="tcp",
                    FromPort="443",
                    ToPort="443",
                    CidrIp='0.0.0.0/0',
                ),
            ],
        )

        self.load_balancer = elb.LoadBalancer(
            'LoadBalancer',
            template=template,
            Subnets=[
                Ref(loadbalancer_a_subnet),
                Ref(loadbalancer_b_subnet),
            ],
            SecurityGroups=[Ref(load_balancer_security_group)],
            Listeners=[elb.Listener(
                LoadBalancerPort=443,
                InstanceProtocol='HTTP',
                InstancePort=web_worker_port,
                Protocol='HTTPS',
                SSLCertificateId=certificate_id,
            )],
            HealthCheck=elb.HealthCheck(
                Target=Join("", ["HTTP:", web_worker_port, "/health-check"]),
                HealthyThreshold="2",
                UnhealthyThreshold="2",
                Interval="100",
                Timeout="10",
            ),
            CrossZone=True,
        )

        template.add_output(Output(
            "LoadBalancerDNSName",
            Description="Loadbalancer DNS",
            Value=GetAtt(self.load_balancer, "DNSName")
        ))