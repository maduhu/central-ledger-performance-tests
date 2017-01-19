from troposphere import (
    AWS_REGION,
    AWS_STACK_ID,
    AWS_STACK_NAME,
    autoscaling,
    Base64,
    cloudformation,
    FindInMap,
    iam,
    Join,
    Parameter,
    Ref,
)

from troposphere.ec2 import (
    SecurityGroup,
    SecurityGroupRule,
)

class ECSAutoScalingGroup(object):
    def __init__(self, template, vpcWrapper, container_instance_role, cluster, load_balancer):
        vpc = vpcWrapper.vpc
        loadbalancer_a_subnet_cidr = vpcWrapper.loadbalancer_a_subnet_cidr
        loadbalancer_b_subnet_cidr = vpcWrapper.loadbalancer_b_subnet_cidr
        container_a_subnet = vpcWrapper.container_a_subnet
        container_b_subnet = vpcWrapper.container_b_subnet


        # ECS container instance profile
        container_instance_profile = iam.InstanceProfile(
            "ContainerInstanceProfile",
            template=template,
            Path="/",
            Roles=[Ref(container_instance_role)],
        )

        container_instance_type = Ref(template.add_parameter(Parameter(
            "ContainerInstanceType",
            Description="The container instance type",
            Type="String",
            Default="t2.micro",
            AllowedValues=["t2.micro", "t2.small", "t2.medium"]
        )))

        web_worker_port = Ref(template.add_parameter(Parameter(
            "WebWorkerPort",
            Description="Web worker container exposed port",
            Type="Number",
            Default="8000",
        )))

        max_container_instances = Ref(template.add_parameter(Parameter(
            "MaxScale",
            Description="Maximum container instances count",
            Type="Number",
            Default="3",
        )))

        desired_container_instances = Ref(template.add_parameter(Parameter(
            "DesiredScale",
            Description="Desired container instances count",
            Type="Number",
            Default="3",
        )))

        template.add_mapping("ECSRegionMap", {
            "eu-west-1": {"AMI": "ami-4e6ffe3d"},
            "us-east-1": {"AMI": "ami-8f7687e2"},
            "us-west-2": {"AMI": "ami-84b44de4"},
        })

        container_security_group = SecurityGroup(
            'ContainerSecurityGroup',
            template=template,
            GroupDescription="Container security group.",
            VpcId=Ref(vpc),
            SecurityGroupIngress=[
                # HTTP from web public subnets
                SecurityGroupRule(
                    IpProtocol="tcp",
                    FromPort=web_worker_port,
                    ToPort=web_worker_port,
                    CidrIp=loadbalancer_a_subnet_cidr,
                ),
                SecurityGroupRule(
                    IpProtocol="tcp",
                    FromPort=web_worker_port,
                    ToPort=web_worker_port,
                    CidrIp=loadbalancer_b_subnet_cidr,
                ),
            ],
        )

        container_instance_configuration_name = "ContainerLaunchConfiguration"

        container_instance_configuration = autoscaling.LaunchConfiguration(
            container_instance_configuration_name,
            template=template,
            Metadata=autoscaling.Metadata(
                cloudformation.Init(dict(
                    config=cloudformation.InitConfig(
                        commands=dict(
                            register_cluster=dict(command=Join("", [
                                "#!/bin/bash\n",
                                # Register the cluster
                                "echo ECS_CLUSTER=",
                                Ref(cluster),
                                " >> /etc/ecs/config\n",
                            ]))
                        ),
                        files=cloudformation.InitFiles({
                            "/etc/cfn/cfn-hup.conf": cloudformation.InitFile(
                                content=Join("", [
                                    "[main]\n",
                                    "template=",
                                    Ref(AWS_STACK_ID),
                                    "\n",
                                    "region=",
                                    Ref(AWS_REGION),
                                    "\n",
                                ]),
                                mode="000400",
                                owner="root",
                                group="root",
                            ),
                            "/etc/cfn/hooks.d/cfn-auto-reload.conf":
                                cloudformation.InitFile(
                                    content=Join("", [
                                        "[cfn-auto-reloader-hook]\n",
                                        "triggers=post.update\n",
                                        "path=Resources.%s."
                                        % container_instance_configuration_name,
                                        "Metadata.AWS::CloudFormation::Init\n",
                                        "action=/opt/aws/bin/cfn-init -v ",
                                        "         --template ",
                                        Ref(AWS_STACK_NAME),
                                        "         --resource %s"
                                        % container_instance_configuration_name,
                                        "         --region ",
                                        Ref("AWS::Region"),
                                        "\n",
                                        "runas=root\n",
                                    ])
                                )
                        }),
                        services=dict(
                            sysvinit=cloudformation.InitServices({
                                'cfn-hup': cloudformation.InitService(
                                    enabled=True,
                                    ensureRunning=True,
                                    files=[
                                        "/etc/cfn/cfn-hup.conf",
                                        "/etc/cfn/hooks.d/cfn-auto-reloader.conf",
                                    ]
                                ),
                            })
                        )
                    )
                ))
            ),
            SecurityGroups=[Ref(container_security_group)],
            InstanceType=container_instance_type,
            ImageId=FindInMap("ECSRegionMap", Ref(AWS_REGION), "AMI"),
            IamInstanceProfile=Ref(container_instance_profile),
            UserData=Base64(Join('', [
                "#!/bin/bash -xe\n",
                "yum install -y aws-cfn-bootstrap\n",

                "/opt/aws/bin/cfn-init -v ",
                "         --template ", Ref(AWS_STACK_NAME),
                "         --resource %s " % container_instance_configuration_name,
                "         --region ", Ref(AWS_REGION), "\n",
            ])),
        )

        autoscaling_group_name = "AutoScalingGroup"

        autoscaling_group = autoscaling.AutoScalingGroup(
            autoscaling_group_name,
            template=template,
            VPCZoneIdentifier=[Ref(container_a_subnet), Ref(container_b_subnet)],
            MinSize=desired_container_instances,
            MaxSize=max_container_instances,
            DesiredCapacity=desired_container_instances,
            LaunchConfigurationName=Ref(container_instance_configuration),
            LoadBalancerNames=[Ref(load_balancer)],
            # Since one instance within the group is a reserved slot
            # for rolling ECS service upgrade, it's not possible to rely
            # on a "dockerized" `ELB` health-check, else this reserved
            # instance will be flagged as `unhealthy` and won't stop respawning'
            HealthCheckType="EC2",
            HealthCheckGracePeriod=300,
        )