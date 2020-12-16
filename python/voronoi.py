# export interface SectionInfo {
#     type: string,
#     parent?: string,
#     sectionType?: string,
#     count: number,
#     id: string,
#     name: string,
#     connectionCount: number
# }

def class SectionInfo:
    def __init__(self, type, parent, sectionType, count, id, name , connectionCount):
        self.type = type
        self.parent = parent
        self.sectionType = sectionType
        self.count = count
        self.id = id
        self.name = name
        self.connectionCount = connectionCount
