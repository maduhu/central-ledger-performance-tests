from troposphere import (
    iam,
    Ref,
)


class EC2ContainerInstance(object):
    def __init__(self, template, container_instance_role):

        # ECS container role
        container_instance_role = iam.Role(
            "ContainerInstanceRole",
            template=template,
            AssumeRolePolicyDocument=dict(Statement=[dict(
                Effect="Allow",
                Principal=dict(Service=["ec2.amazonaws.com"]),
                Action=["sts:AssumeRole"],
            )]),
            Path="/",
            Policies=[
                iam.Policy(
                    PolicyName="ECSManagementPolicy",
                    PolicyDocument=dict(
                        Statement=[dict(
                            Effect="Allow",
                            Action=[
                                "ecs:*",
                                "elasticloadbalancing:*",
                            ],
                            Resource="*",
                        )],
                    ),
                ),
            ]
        )


        # ECS container instance profile
        container_instance_profile = iam.InstanceProfile(
            "ContainerInstanceProfile",
            template=template,
            Path="/",
            Roles=[Ref(container_instance_role)],
        )