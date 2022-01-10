export type SocketItemMeta = {
  manifestDefinition?: any
}

export class SocketItem {
  _meta?: SocketItemMeta
  iconUrl?: string
  name?: string

  constructor(definition: any) {
    this._meta = {
      manifestDefinition: definition
    }
    this.iconUrl = `https://www.bungie.net${definition.displayProperties.icon}`
    this.name = definition.displayProperties.name
  }

  getDescription(): string {
    if(this._meta?.manifestDefinition?.displayProperties?.description) {
      return this._meta?.manifestDefinition?.displayProperties?.description
    }
    return ""
  }
}
