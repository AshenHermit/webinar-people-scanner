async function getValueFromStorage(key){
    return new Promise((resolve, reject)=>{
        chrome.storage.local.get(key, (data)=>{
            if(key in data){
                resolve(data[key])
            }
        })
    })
}

/**
 * returns dict of translated keys and values from storage
 * @param {Object<string, string>} keys_translation 
 * @returns {Promise<Object<string, string>>}
 */
async function getValuesFromStorage(keys_translation){
    return new Promise((resolve, reject)=>{
        var keys = Object.keys(keys_translation)
        var dict = {}
        chrome.storage.local.get(keys, (data)=>{
            var failed = false
            keys.forEach(key=>{
                if(key in data){
                    dict[keys_translation[key]] = data[key]
                }else{
                    console.error(`no field "${key}" in storage`)
                    failed = true
                }
            })
            resolve(dict)
        })
    })
}
async function writeValuesToStorage(object, keys_translation){
    return new Promise((resolve, reject)=>{
        var keys = Object.keys(keys_translation)
        var dict = Object.assign({}, object)
        keys.forEach(key=>{
            dict[key] = dict[keys_translation[key]]
            delete dict[keys_translation[key]]
        })
        chrome.storage.local.set(dict, ()=>{
            resolve()
        })
    })
}

var config_keys_translation = {"mbc_extension_token": "token", "mbc_extension_api_server": "api_server", "mbc_extension_main_server": "main_server"}
class Config extends Exportable{
    constructor(){
        super()
        this.token = ""
        this.api_server = ""
        this.main_server = ""
    }
}
/**@type {Config}*/
var default_config = new Config()
default_config.api_server = "https://mbc-d.ru/api/extension/"
default_config.main_server = "https://mbc-d.ru/"

/**
 * returns dict containing config fields
 * @returns {Promise<Config>}
 */
async function readConfigFromStorage(){
    try{
        var data = await getValuesFromStorage(config_keys_translation)
        var default_config_copy = default_config.exportData()
        data = Object.assign(default_config_copy, data)
        
        var config = new Config()
        config.importData(data)
        return config
    }
    catch(e){
        return {}
    }
}
/**
 * @param {Config} config
 * writes config to storage
 * @returns {Promise<Object<string, string>>}
 */
async function writeConfigToStorage(config){
    try{
        return await writeValuesToStorage(config.exportData(), config_keys_translation)
    }
    catch(e){
        return null
    }
}