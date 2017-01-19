from troposphere.ecs import (
    Cluster,
)

class ECSCluster(object):
    def __init__(self, name, template):

        self.cluster_name = name
        self.cluster = Cluster(self.cluster_name, template)