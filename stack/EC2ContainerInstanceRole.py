from troposphere import (
    iam,
    Join,
    Ref,
)

from awacs import ecr

class EC2ContainerInstanceRole(object):
    def __init__(self, template):

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
                #iam.Policy(
                #     PolicyName="AssetsManagementPolicy",
                #     PolicyDocument=dict(
                #         Statement=[dict(
                #             Effect="Allow",
                #             Action=[
                #                 "s3:ListBucket",
                #             ],
                #             Resource=Join("", [
                #                 "arn:aws:s3:::",
                #                 Ref(assets_bucket),
                #             ]),
                #         ), dict(
                #             Effect="Allow",
                #             Action=[
                #                 "s3:*",
                #             ],
                #             Resource=Join("", [
                #                 "arn:aws:s3:::",
                #                 Ref(assets_bucket),
                #                 "/*",
                #             ]),
                #         )],
                #     ),
                # ),
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
                iam.Policy(
                    PolicyName='ECRManagementPolicy',
                    PolicyDocument=dict(
                        Statement=[dict(
                            Effect='Allow',
                            Action=[
                                ecr.GetAuthorizationToken,
                                ecr.GetDownloadUrlForLayer,
                                ecr.BatchGetImage,
                                ecr.BatchCheckLayerAvailability,
                            ],
                            Resource="*",
                        )],
                    ),
                ),
                iam.Policy(
                    PolicyName="LoggingPolicy",
                    PolicyDocument=dict(
                        Statement=[dict(
                            Effect="Allow",
                            Action=[
                                "logs:Create*",
                                "logs:PutLogEvents",
                            ],
                            Resource="arn:aws:logs:*:*:*",
                        )],
                    ),
                ),
            ]
        )