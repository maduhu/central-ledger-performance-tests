from troposphere import (
    AWS_ACCOUNT_ID,
    AWS_REGION,
    Equals,
    GetAtt,
    Join,
    Not,
    Parameter,
    Ref,
)

from troposphere.ecs import (
    ContainerDefinition,
    Environment,
    LogConfiguration,
    PortMapping,
    TaskDefinition,
)

# from .template import template
# from .assets import (
#     assets_bucket,
#     distribution,
# )
# from .database import (
#     db_instance,
#     db_name,
#     db_user,
#     db_password,
# )
# from .domain import domain_name
# from .repository import repository


class ECSTaskDefinition(object):
    def __init__(self, template, container_instance_role):
        web_worker_cpu = Ref(template.add_parameter(Parameter(
            "WebWorkerCPU",
            Description="Web worker CPU units",
            Type="Number",
            Default="512",
        )))

        web_worker_memory = Ref(template.add_parameter(Parameter(
            "WebWorkerMemory",
            Description="Web worker memory",
            Type="Number",
            Default="700",
        )))

        web_worker_desired_count = Ref(template.add_parameter(Parameter(
            "WebWorkerDesiredCount",
            Description="Web worker task instance count",
            Type="Number",
            Default="2",
        )))

        app_revision = Ref(template.add_parameter(Parameter(
            "WebAppRevision",
            Description="An optional docker app revision to deploy",
            Type="String",
            Default="",
        )))

        deploy_condition = "Deploy"
        template.add_condition(deploy_condition, Not(Equals(app_revision, "")))

        secret_key = Ref(template.add_parameter(Parameter(
            "SecretKey",
            Description="Application secret key",
            Type="String",
        )))

        # ...


        # ECS task
        web_task_definition = TaskDefinition(
            "WebTask",
            template=template,
            Condition=deploy_condition,
            ContainerDefinitions=[
                ContainerDefinition(
                    Name="WebWorker",
                    #  1024 is full CPU
                    Cpu=web_worker_cpu,
                    Memory=web_worker_memory,
                    Essential=True,
                    Image=Join("", [
                        Ref(AWS_ACCOUNT_ID),
                        ".dkr.ecr.",
                        Ref(AWS_REGION),
                        ".amazonaws.com/",
                        Ref(repository),
                        ":",
                        app_revision,
                    ]),
                    PortMappings=[PortMapping(
                        ContainerPort=web_worker_port,
                        HostPort=web_worker_port,
                    )],
                    LogConfiguration=LogConfiguration(
                        LogDriver="awslogs",
                        Options={
                            'awslogs-group': Ref(web_log_group),
                            'awslogs-region': Ref(AWS_REGION),
                        }
                    ),
                    Environment=[
                        Environment(
                            Name="AWS_STORAGE_BUCKET_NAME",
                            Value=Ref(assets_bucket),
                        ),
                        Environment(
                            Name="CDN_DOMAIN_NAME",
                            Value=GetAtt(distribution, "DomainName"),
                        ),
                        Environment(
                            Name="DOMAIN_NAME",
                            Value=domain_name,
                        ),
                        Environment(
                            Name="PORT",
                            Value=web_worker_port,
                        ),
                        Environment(
                            Name="SECRET_KEY",
                            Value=secret_key,
                        ),
                        Environment(
                            Name="DATABASE_URL",
                            Value=Join("", [
                                "postgres://",
                                Ref(db_user),
                                ":",
                                Ref(db_password),
                                "@",
                                GetAtt(db_instance, 'Endpoint.Address'),
                                "/",
                                Ref(db_name),
                            ]),
                        ),
                    ],
                )
            ],
        )