import Socket from "./Socket"
import SocketItem from "./SocketItem"
import { ItemTypeEnum, ItemSubTypeEnum, DamageTypeEnum, BucketTypeEnum, SocketTypeEnum } from "./Enums"

export type ItemMeta = {
  // Item definition from the manifest
  manifestDefinition?: any
  // Raw item from API response
  inventoryItem?: any
  energyTypeDefinition?: any
  // Instanced item from API response
  instance?: any
  perks?: any
  sockets?: any
  damageType?: any
  reusablePlugs?: any
  stats?: any
  source?: string
}

export default class Item {
  _meta: ItemMeta
  hash?: number
  iconUrl?: string
  name?: string
  classType?: number
  isExotic?: boolean
  isOrnament?: boolean
  itemType?: ItemTypeEnum
  itemSubType?: ItemSubTypeEnum
  damageType?: DamageTypeEnum
  slot?: BucketTypeEnum
  sockets?: Socket[]
  power?: number
  stats?: Map<string, number>
  quantity?: number
  // TODO: Make this a Character class
  location?: any
  isVaulted?: boolean

  constructor(item: any, itemComponents: any, source?: string) {
    this._meta = {}
    if(source) {
      this._meta.source = source
      if(source === "profilePlugs") {
        this.isOrnament = true
      }
      if(source === "profileInventory") {
        this.isVaulted = true
      }
    }
    this._meta.inventoryItem = item
    if(itemComponents) {
      if(itemComponents.instances.data[item.itemInstanceId]) {
        this._meta.instance = itemComponents.instances.data[item.itemInstanceId]
      }
      if(itemComponents.perks.data[item.itemInstanceId]) {
        this._meta.perks = itemComponents.perks.data[item.itemInstanceId].perks
      }
      if(itemComponents.sockets.data[item.itemInstanceId]) {
        this._meta.sockets = itemComponents.sockets.data[item.itemInstanceId].sockets
      }
      if(itemComponents.reusablePlugs.data[item.itemInstanceId]) {
        this._meta.reusablePlugs = itemComponents.reusablePlugs.data[item.itemInstanceId].plugs
      }
      if(itemComponents.stats.data[item.itemInstanceId]) {
        this._meta.stats = itemComponents.stats.data[item.itemInstanceId].stats
      }
    }
  }

  populate(manifestService: any, plugSets: any) {
    // Basic info
    let itemHash = 0
    if(this._meta?.inventoryItem.itemHash) {
      itemHash = this._meta?.inventoryItem.itemHash
    }

    if(this._meta.inventoryItem.plugItemHash) {
      itemHash = this._meta.inventoryItem.plugItemHash
    }
    this.hash = itemHash
    let itemDef = manifestService.getItem("DestinyInventoryItemDefinition", itemHash);
    if(itemDef) {
      this._meta.manifestDefinition = itemDef
    }

    if(itemDef && itemDef.inventory && itemDef.inventory.tierType === 6) {
      this.isExotic = true
    }

    if(itemDef && itemDef.displayProperties && itemDef.displayProperties.icon) {
      this.iconUrl = `https://www.bungie.net${itemDef.displayProperties.icon}`
      this.name = itemDef.displayProperties.name
      this.itemType = itemDef.itemType
      this.itemSubType = itemDef.itemSubType
      this.classType = itemDef.classType
    }

    if(itemDef && itemDef.inventory && itemDef.inventory.bucketTypeHash) {
      this.slot = itemDef.inventory.bucketTypeHash
    }

    if(this._meta.instance) {
      let damageTypeDefinition = manifestService.getItem("DestinyDamageTypeDefinition", this._meta.instance.damageTypeHash)
      if(damageTypeDefinition) {
        this._meta.damageType = damageTypeDefinition
        // TODO: Populate an enum
      }

      if(this._meta.instance.energy) {
        let energyTypeDefinition = manifestService.getItem("DestinyEnergyTypeDefinition", this._meta.instance.energy.energyTypeHash)
        if(energyTypeDefinition) {
          this._meta.energyTypeDefinition = energyTypeDefinition
        }
      }
    }

    // Stats
    if(this._meta.stats) {
      // TODO: Turn this into an object and store the stat def with the obj
      this.stats = new Map<string, number>()
      Object.keys(this._meta.stats).forEach((key: string) => {
        let statDefinition = manifestService.getItem("DestinyStatDefinition", key)
        if(statDefinition) {
          this.stats?.set(statDefinition.displayProperties.name, this._meta.stats[key])
        }
      })
    }

    // Perks & Mods
    if(itemDef && itemDef.sockets && itemDef.sockets.socketEntries) {
      // TODO: Remove the anys
      itemDef.sockets.socketEntries.forEach((se: any, idx: number) => {
        let socket: Socket = {
          _meta: {},
          position: idx
        }
        // socket.type = se.socketTypeHash
        let type = manifestService.getItem("DestinySocketTypeDefinition", se.socketTypeHash)
        if(type && socket && socket._meta) {
          socket._meta.typeDefinition = type
          let category = manifestService.getItem("DestinySocketCategoryDefinition", type.socketCategoryHash)
          if(category) {
            socket._meta.categoryDefinition = category
          }
        }

        if(this._meta.sockets && this._meta.sockets[idx] && socket && socket._meta) {
          socket._meta.itemSocketMeta = this._meta.sockets[idx]
          let plugDef = manifestService.getItem("DestinyInventoryItemDefinition", this._meta.sockets[idx].plugHash)
          if(plugDef) {
            socket.equippedPlug = new SocketItem(plugDef)

            if(this._meta.reusablePlugs && this._meta.reusablePlugs[idx]) {
              let availablePlugs: SocketItem[] = []
              this._meta.reusablePlugs[idx].forEach((plug: any) => {
                let def = manifestService.getItem("DestinyInventoryItemDefinition", plug.plugItemHash)
                let socketItem = new SocketItem(def)
                availablePlugs.push(socketItem)
              })
              socket.availablePlugs = availablePlugs
            }
          }
        }

        // This might show all available plugs for the item...
        if(plugSets && se.randomizedPlugSetHash) {
          // console.log(se.randomizedPlugSetHash)
          let plugSet = plugSets.plugs[se.randomizedPlugSetHash]
          if(plugSet && socket && socket._meta) {
            socket._meta.plugSet = plugSet
            let potentialPlugs: SocketItem[] = []
            plugSet.forEach((plug: any) => {
              let def = manifestService.getItem("DestinyInventoryItemDefinition", plug.plugItemHash)
              let socketItem = new SocketItem(def)
              potentialPlugs.push(socketItem)
            })
            socket.potentialPlugs = potentialPlugs
          }
        }

        if(this.sockets === undefined) {
          this.sockets = []
        }
        this.sockets.push(socket)
      })
    }
  }

  getIntrinsicTraits(): (SocketItem[] | null) {
    if(this.itemType === ItemTypeEnum.Weapon) {
      let items: Array<SocketItem> = []
      this.sockets?.forEach(s => {
        if(s._meta?.categoryDefinition?.hash === SocketTypeEnum.IntrinsicTraits &&
          s._meta?.itemSocketMeta?.isVisible &&
          s.equippedPlug) {
          items.push(s.equippedPlug)
        }
      })
      return items
    } else {
      return null
    }
  }

  getPerkSockets(): (Socket[] | null) {
    if(this.itemType === ItemTypeEnum.Weapon && this.sockets) {
      return this.sockets?.filter((s: Socket) => s._meta?.categoryDefinition?.hash === SocketTypeEnum.WeaponPerks)
    }
    // if(this.itemType === ItemTypeEnum.Armor && this.sockets) {
    //   return this.sockets?.filter((s: Socket) => s._meta?.categoryDefinition?.hash === SocketTypeEnum.ArmorPerks)
    // }
    return null
  }

  getEquippedPerks(): (SocketItem[] | null) {
    if(this.itemType === ItemTypeEnum.Weapon) {
      let items: Array<SocketItem> = []
      this.sockets?.forEach(s => {
        if(s._meta?.categoryDefinition?.hash === SocketTypeEnum.WeaponPerks &&
          s._meta?.itemSocketMeta?.isVisible &&
          s.equippedPlug) {
          items.push(s.equippedPlug)
        }
      })
      return items
    } else {
      return null
    }
  }

  getModSockets(): (Socket[] | null) {
    if(this.itemType === ItemTypeEnum.Weapon) {
      if(this.sockets) {
        return this.sockets.filter((s: Socket) => s._meta?.categoryDefinition && s._meta?.categoryDefinition.hash === SocketTypeEnum.WeaponMods)
      }
    }
    if(this.itemType === ItemTypeEnum.Armor) {
      if(this.sockets) {
        return this.sockets.filter((s: Socket) => s._meta?.categoryDefinition && s._meta?.categoryDefinition.hash === SocketTypeEnum.ArmorMods)
      }
    }
    return null
  }

  getEquippedMods(): (SocketItem[] | null) {
    if(this.itemType === ItemTypeEnum.Weapon) {
      let items: Array<SocketItem> = []
      this.sockets?.forEach(s => {
        if(s._meta?.categoryDefinition?.hash === SocketTypeEnum.WeaponMods &&
          s._meta?.itemSocketMeta?.isVisible &&
          s.equippedPlug) {
          items.push(s.equippedPlug)
        }
      })
      return items
    }
    if(this.itemType === ItemTypeEnum.Armor) {
      let items: Array<SocketItem> = []
      this.sockets?.forEach(s => {
        if(s._meta?.categoryDefinition?.hash === SocketTypeEnum.ArmorMods &&
          s._meta?.itemSocketMeta?.isVisible &&
          s.equippedPlug) {
          items.push(s.equippedPlug)
        }
      })
      return items
    }
    return null
  }

  getPower(): (number | null) {
    if(this._meta.instance && this._meta.instance.primaryStat) {
      return this._meta.instance.primaryStat.value
    }
    return null
  }

  getAffinityIcon() {
    if(this._meta.damageType && this._meta.damageType.displayProperties && this._meta.damageType.displayProperties.hasIcon) {
      return `https://www.bungie.net${this._meta.damageType.displayProperties.icon}`
    }
    if(this._meta.energyTypeDefinition && this._meta.energyTypeDefinition.displayProperties && this._meta.energyTypeDefinition.displayProperties.hasIcon) {
      return `https://www.bungie.net${this._meta.energyTypeDefinition.displayProperties.icon}`
    }
    return null
  }

  getItemTier() {

  }

  getStats() {
    let power = this._meta.instance.primaryStat.value
  }
}