export interface SectionResults {
    sectioned: Sectioned,
    others: { [id: string]: Other }
}

export interface Sectioned {
    [str: string]: SectionInfo
}
export interface SectionInfo {
    type: string,
    parent?: string,
    sectionType?: string,
    count: number,
    id: string,
    name: string,
    connectionCount: number
}
export interface Child {

}
export interface Other {
    type: string;
    name: string
}