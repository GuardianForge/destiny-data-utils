import BungieApiService from "./BungieApiService"
import BungieAuthService from "./BungieAuthService"
import IManifestCache from "./interfaces/IManifestCache"

export default class ManifestService {
  bungieApiService: BungieApiService
  cache?: IManifestCache
  manifestVersion: string
  components: string[]
  manifestData: Map<string, any>

  allComponents = [

  ]

  collections = {
    CONFIG: "config",
    MANIFEST: "manifest"
  }

  constructor(bungieApiService: BungieApiService, cache?: IManifestCache, components?: string[]) {
    this.bungieApiService = bungieApiService
    this.cache = cache

    this.manifestVersion = ""
    if(components !== undefined) {
      this.components = components
    } else {
      this.components = this.allComponents
    }

    // this.components = [
    //   "DestinyInventoryItemDefinition",
    //   "DestinySocketTypeDefinition",
    //   "DestinySocketCategoryDefinition",
    //   "DestinyDamageTypeDefinition",
    //   "DestinyStatDefinition",
    //   "DestinyInventoryBucketDefinition",
    //   "DestinyTalentGridDefinition",
    //   "DestinyActivityDefinition",
    //   "DestinyActivityTypeDefinition",
    //   "DestinyActivityModeDefinition",
    //   "DestinyActivityGraphDefinition",
    //   "DestinyEnergyTypeDefinition"
    // ]

    // window.manifestComponents = {}
    this.manifestData = new Map<string, any>()
  }

  // bucketLocationMap = {}

  async init() {
    if(this.cache !== undefined) {
      await this.cache.init([this.collections.CONFIG, this.collections.MANIFEST])
    }

    let manifest = await this.bungieApiService.fetchManifest()
    this.manifestVersion = manifest.version

    if(this.cache !== undefined) {
      let dbVersion = await this.cache.get("config", "manifestVersion")
      if(!dbVersion) {
        await this.initManifest(manifest)
      } else if(dbVersion !== this.manifestVersion) {
        await this.cache.clearStore(this.collections.MANIFEST)
        await this.initManifest(manifest)
      } else {
        await this.importManifestFromDb()
        let isImportFromDbSuccessful = this.isImportFromDbSuccessful()
        if(!isImportFromDbSuccessful) {
          console.warn("Manifest cache is corrupted, re-imorting manifest...")
          await this.cache.clearStore(this.collections.MANIFEST)
          await this.initManifest(manifest)
        }
      }
    } else {
      await this.initManifest(manifest)
    }
  }

  // TODO: Define manifest response
  async initManifest(manifest: any) {
    if(this.cache !== undefined) {
      await this.cache.put(this.collections.CONFIG, "manifestVersion", this.manifestVersion)
    }
    await this.populateFromInternet(manifest)
    await this.cacheManifest()
  }

  async populateFromInternet(manifest: any) {
    let componentKeys = Object.keys(manifest.jsonWorldComponentContentPaths.en)

    let fetchManifestComponentPromises: Promise<any>[] = []
    componentKeys.forEach(key => {
      if(this.components.find(el => el === key)) {
        let componentUrl = manifest.jsonWorldComponentContentPaths.en[key]
        fetchManifestComponentPromises.push(this.bungieApiService.fetchManifestComponent(key, componentUrl))
      }
    })
    let rawManifestData = await Promise.all(fetchManifestComponentPromises)

    rawManifestData.forEach(el =>  this.importComponent(el.componentName, el.data))
  }

  async cacheManifest() {
    if(this.cache !== undefined) {
      let promises: Promise<any>[] = []
      Object.keys(this.manifestData).forEach(key => {
        // @ts-ignore TODO: Figure out how to get the interface to return a promise
        promises.push(this.cache.add(this.collections.MANIFEST, key, this.manifestData.get(key)))
      })
      await Promise.all(promises)

    }
  }

  async importManifestFromDb() {
    if(this.cache !== undefined) {
      let manifestKeys = await this.cache.getKeys(this.collections.MANIFEST)
      if(manifestKeys !== null) {
        let promises: Promise<any>[] = []
        manifestKeys.forEach((el: string) => promises.push(this.importManifestComponentFromDb(el)))
        await Promise.all(promises)
      }
    }
  }

  isImportFromDbSuccessful() {
    let out = true
    this.components.forEach(el => {
      if(out === false || !this.manifestData.get(el) || Object.keys(this.manifestData.get(el)).length === 0) {
        out = false
        return
      }
    })
    return out
  }

  async importManifestComponentFromDb(manifestKey: string) {
    if(this.cache) {
      let data = await this.cache.get(this.collections.MANIFEST, manifestKey)
      this.importComponent(manifestKey, data)
    }
  }

  async importComponent(componentName: string, data: any) {
    this.manifestData.set(componentName, data)
  }

  getItem(componentName: string, hash: string) {
    if(!this.manifestData.get(componentName)) {
      console.warn(`manifestService.getItem: ${componentName} is not imported`)
      return false
    }
    return this.manifestData.get(componentName)[hash]
  }
}
