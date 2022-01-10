# Destiny Data Utils

Destiny Data Utils is a library designed to make building third party applications around Destiny 2 easier. This project is an iteration on the front end code built for GuardianForge to download manifest data, assist with caching, and massage the data into a more developer-friendly format. More info coming soon.

> ⚠️ This project is in VERY early development and is likely to change frequently over the coming weeks.

## Project Outline

Below are the various components included with this library:

| Utility | Description |
|---------|-------------|
| BungieApiService | A wrapper around the Bungie.net API |
| ManifestService | Contains logic on how to download and optionally cache the Destiny 2 Manifest |
| IManifestCache | An interface used by ManifestSevice to cache the manifest |
| IndexedDbService | An implementation of IManifestCache that will cache the manifest to the browser's IndexedDb datastore|

## Examples

### Downloading & Caching the Manifest

This example is taken directly from the main GuardianForge.net repo.

```js
// Define the database name & version for the IndexedDbService
const DB_NAME = "destinybuilds.gg"
const DB_VERSION = 5
let dbService = new IndexedDbService(DB_NAME, DB_VERSION)

// Create an instance of the BungieApiService, which the ManifestService uses to connect to Bungie's API.
let bungieApiService = new BungieApiService(config.bungieApiKey)

// Create the ManifestService, passing in both objects from above.
let manifestService = new ManifestService(bungieApiService, dbService)

// Calling 'init' on the ManifestService executes the logic to download the current manifest data and cache it. If the implementation of IManifestCache (IndexedDbService in this example) contains a copy of the manifest data that matches the version pulled from the metadata, the cached version will be loaded instead.
await manifestService.init()
```

If you only need a subset of the manifest, you can pass in a list of components like so. This saves time on minimizing the number of network calls to download the components.

```js
// If you only need a subset of the manifest, you can optionally pass in an array of component names.
const components = [
  "DestinyInventoryItemDefinition",
  "DestinySocketTypeDefinition",
  "DestinySocketCategoryDefinition",
  "DestinyDamageTypeDefinition",
  "DestinyStatDefinition",
  "DestinyInventoryBucketDefinition",
  "DestinyTalentGridDefinition",
  "DestinyActivityDefinition",
  "DestinyActivityTypeDefinition",
  "DestinyActivityModeDefinition",
  "DestinyActivityGraphDefinition",
  "DestinyEnergyTypeDefinition"
]
let manifestService = new ManifestService(bungieApiService, dbService, components)
```

## To Do

- [ ] Unit testing