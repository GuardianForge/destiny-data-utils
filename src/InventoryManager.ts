import { BungieApiService } from "./BungieApiService";
import { Item } from "./models/Item";
import Socket from "./models/Socket";
import { ClassEnum, SocketTypeEnum, BucketTypeEnum, ItemTypeEnum, ItemSubTypeEnum } from "./models/Enums";
import { ManifestService } from "./ManifestService";

export type UserInventory = {
  items: Item[]
}

export class InventoryManager {
  _bungieApiService: BungieApiService
  _manifestService: ManifestService
  _inventory: UserInventory

  constructor(bungieApiService: BungieApiService, manifestService: ManifestService) {
    this._bungieApiService = bungieApiService
    this._manifestService = manifestService
    this._inventory = {
      items: []
    }
  }

  loadInventory(inventoryResponse: any) {
    console.log("loadInventory", inventoryResponse)
    const {
      profileInventory,
      itemComponents,
      profilePlugSets,
      characterInventories,
      characterPlugSets,
      characterCurrencyLookups,
      characters
    } = inventoryResponse

    profileInventory.data.items.forEach((el: any) => {
      // TODO: Turn these locations into an enum
      let item = new Item(el, itemComponents, "profileInventory")
      item.populate(this._manifestService, profilePlugSets.data)
      this._inventory?.items.push(item)
    })

    Object.keys(characterInventories.data).forEach((k: string) => {
      characterInventories.data[k].items.forEach((el: any) => {
        let item = new Item(el, itemComponents, "characterInventories")
        item.populate(this._manifestService, characterPlugSets.data[k])
        if(characters && characters.data && characters.data[k]) {
          item.location = characters.data[k]
        }
        this._inventory?.items.push(item)
      })
    })

    let profilePlugs = profilePlugSets.data.plugs
    Object.keys(profilePlugs).forEach((k: string) => {
      profilePlugs[k].forEach((plug: any) => {
        let item = new Item(plug, itemComponents, "profilePlugs")
        item.populate(this._manifestService, null)
        this._inventory?.items.push(item)
      })
    })

    Object.keys(characterCurrencyLookups.data).forEach((k: string) => {
      Object.keys(characterCurrencyLookups.data[k].itemQuantities).forEach((hash: string) => {
        // Fix for subclass issue, not sure why subclasses sometimes show in inventory and some in currencies...
        let itemHash = Number(hash)
        if(!this._inventory?.items.find((i: Item) => i.hash == itemHash)) {
          let item = new Item({
            itemHash: itemHash
          }, null, "characterCurrencyLookups")
          item.populate(this._manifestService, null)
          item.quantity = characterCurrencyLookups.data[k].itemQuantities[hash]
          if(characters && characters.data && characters.data[k]) {
            item.location = characters.data[k]
          }
          this._inventory?.items.push(item)
        }
      })
    })

    console.log("populated inventory", this._inventory)
  }

  getAvailableSubclasses(classType: ClassEnum): Array<Item> {
    return this.lookupItems(undefined, undefined, classType, BucketTypeEnum.Subclass)
  }

  // Returns a list of items based on the filters passed in
  lookupItems(type?: ItemTypeEnum, subType?: ItemSubTypeEnum, classType?: ClassEnum, slot?: BucketTypeEnum): Array<Item> {
    if(!this._inventory) {
      throw new Error("Inventory not yet loaded")
    }
    if(type === undefined && subType === undefined && classType == undefined) {
      throw new Error("One or more of type, subType, or classType must be defined")
    }

    let returnItems: Array<Item> = []
    if(type !== null && type != undefined) {
      returnItems = this._inventory.items.filter((i: Item) => i.itemType === type && !i.isOrnament)
    }

    if(subType !== null && subType !== undefined) {
      if(returnItems.length === 0) {
        returnItems = this._inventory.items.filter((i: Item) => i.itemSubType === subType && !i.isOrnament)
      } else {
        returnItems = returnItems.filter((i: Item) => i.itemSubType === subType && !i.isOrnament)
      }
    }

    if(classType !== null && classType !== undefined) {
      if(returnItems.length === 0) {
        returnItems = this._inventory.items.filter((i: Item) => i.classType === classType && !i.isOrnament)
      } else {
        returnItems = returnItems.filter((i: Item) => i.classType === classType && !i.isOrnament)
      }
    }

    if(slot !== null && slot != undefined) {
      if(returnItems.length === 0) {
        returnItems = this._inventory.items.filter((i: Item) => i.slot === slot && !i.isOrnament)
      } else {
        returnItems = returnItems.filter((i: Item) => i.slot === slot && !i.isOrnament)
      }
    }
    return returnItems
  }

  getModsForItem(item: Item): (Map<number, Item[]> | null) {
    if(!item.sockets) {
      return null
    }

    let whitelistPlugHashes: any= {}

    item.sockets.forEach((socket: Socket) => {
      if(socket._meta?.categoryDefinition &&
        socket.position &&
        (socket._meta?.categoryDefinition?.hash === SocketTypeEnum.WeaponMods ||
        socket._meta?.categoryDefinition.hash === SocketTypeEnum.ArmorMods)) {
          let hashes = socket._meta.typeDefinition.plugWhitelist.map((pwl: any) => pwl.categoryHash)
          whitelistPlugHashes[socket.position] = hashes
        }
    })

    let socketPlugMap: Map<number, Item[]> = new Map<number, Item[]>()

    Object.keys(whitelistPlugHashes).forEach((key: string) => {
      let items: Item[] = []
      whitelistPlugHashes[key].forEach((hash: number) => {
        this._inventory?.items.forEach((i: Item) => {
          if(i._meta.manifestDefinition.plug && i._meta?.manifestDefinition?.plug?.plugCategoryHash === hash) {
            if(!items.find((ci: Item) => ci.hash === i.hash)) {
              items.push(i)
            }
          }
        })
      })

      if(items) {
        socketPlugMap.set(Number(key), items)
        // socketPlugMap[key] = items
      }
    })

    return socketPlugMap
  }
}