class PeopleLibrary extends Exportable{
    constructor(){
        super()
        this.registerClasses({people: Person})
        /**@type {Array<Person>}*/
        this.people = []
    }
    justify(){
        this.people.forEach(x=>{x.justify()})
    }
    getPersonByName(personName){
        var person = this.people.find(x=>x.name == personName)
        if(person){
            return person
        }else{
            // strange case but still
            var reversedName = personName.split(" ").reverse().join(" ")
            var person = this.people.find(x=>x.name == reversedName)
            return person
        }
    }
    hasPerson(personName){
        var person = this.getPersonByName(personName)
        return person!=undefined
    }
}

class Person extends Exportable{
    constructor(){
        super()
        /**@type {String}*/
        this.id
        /**@type {String}*/
        this.name
        /**@type {String}*/
        this.vk_id
    }
    justify(){
        this.name = Person.justifyName(this.name)
    }
}
Person.justifyName = function(personName){
    personName = personName.toLowerCase()
    personName = personName.replaceAll("ё","е")
    personName = personName.split(" ").map(x=>x.charAt(0).toUpperCase() + x.slice(1)).join(" ")
    return personName
}

class ScanResult extends Exportable{
    constructor(){
        super()
        this.registerClasses({presentList:Person, absentList:Person, addedItemsList:Person, removedItemsList:Person})
        /**@type {Array<Person>} */
        this.presentList = []
        /**@type {Array<Person>} */
        this.absentList = []
        /**@type {Array<Person>} */
        this.addedItemsList = []
        /**@type {Array<Person>} */
        this.removedItemsList = []
    }
}

class RemoteApi{
    constructor(api_server){
        this.api_server = api_server
        this.token = null
    }
    async auth(token){
        return new Promise((resolve, reject)=>{
            this.token = token
            resolve(true)
        })
    }

    async processFetchCall(call){
        return new Promise((resolve, reject)=>{
            call.then(res=>{
                if(res.ok){
                    return res.json()
                }
                reject(res)
            })
            .then(data=>{
                resolve(data)
            })
            .catch((e)=>{
                console.error(e)
                reject(e)
            })
        })
    }

    async makeGetRequest(url){
        return await this.processFetchCall(fetch(url))
    }
    async makePostRequest(url, data={}, postData={}){
        // var data = exportableData.exportData()
        var mainPostData = {
            data: JSON.stringify(data)
        }
        Object.assign(mainPostData, postData)
        var formData = new FormData()
        Object.keys(mainPostData).forEach(key=>{
            formData.append(key, mainPostData[key])
        })

        return await this.processFetchCall(fetch(url, {method: 'POST', body: formData}))
    }
    createApiCallUrl(method, writeToken=true){
        var url = this.api_server + method
        if(writeToken){
            if(url.indexOf("?")==-1)
                url += "/?"
            url += "&t=" + this.token
        }
        return url
    }
    async makeGetApiCall(method){
        var url = this.createApiCallUrl(method)
        var result = await this.makeGetRequest(url)
        return result
    }
    async makePostApiCall(method, data, postData={}){
        var url = this.createApiCallUrl(method, false)
        var result = await this.makePostRequest(
            url, data, 
            Object.assign(postData, {t: this.token}))
        return result
    }

    /** @returns {Promise<PeopleLibrary>} */
    async getGroupMembers(){
        var people = await this.makeGetApiCall("get_group_data")

        var peopleLib = new PeopleLibrary()
        var data = {people: people}
        peopleLib.importData(data)

        return peopleLib

        // TODO: dead code
        return new Promise((resolve, reject)=>{
            // for debug
            // var peopleLib = new PeopleLibrary()
            // peopleLib.importData({people: [{"name":"Амелина Кристина","vk_shortname":"id188453892"},{"name":"Амирагян Эмануель","vk_shortname":"id475539675"},{"name":"Бабаев Николай","vk_shortname":"id207539407"},{"name":"Баторова Аяна","vk_shortname":"id101425599"},{"name":"Дубровский Владислав","vk_shortname":"id309556221"},{"name":"Зиннуров Эмиль","vk_shortname":"id336557871"},{"name":"Зотова Екатерина","vk_shortname":"id174329217"},{"name":"Казаков Денис","vk_shortname":"id71271737"},{"name":"Карандашов Дмитрий","vk_shortname":"id548559506"},{"name":"Каширин Евгений","vk_shortname":"id237039005"},{"name":"Кириленко Алексей","vk_shortname":"id392577017"},{"name":"Колпакова Полина","vk_shortname":"id305703963"},{"name":"Лапинский Максим","vk_shortname":"id299164852"},{"name":"Любимов Кирилл","vk_shortname":"id587774508"},{"name":"Марченко Иван","vk_shortname":"id273457784"},{"name":"Морозов Егор","vk_shortname":"id576828276"},{"name":"Пивкин Александр","vk_shortname":"id348657437"},{"name":"Прошкин Антон","vk_shortname":"id319583497"},{"name":"Савельева Анастасия","vk_shortname":"id274001204"},{"name":"Савостин Иван","vk_shortname":"id241713455"},{"name":"Смирнов Никита","vk_shortname":"id231862769"},{"name":"Толмаков Артем","vk_shortname":"id185127297"},{"name":"Фонин Дмитрий","vk_shortname":"id285423900"},{"name":"Чурилов Сергей","vk_shortname":"id372965114"},{"name":"Чурсина Юлия","vk_shortname":"id227805855"},{"name":"Шварц Никита","vk_shortname":"id464321956"},{"name":"Шириширенко Никита","vk_shortname":"id285710543"},{"name":"Ядикарян Доминик","vk_shortname":"id321066557"},{"name":"Ярастов Илья","vk_shortname":"id358797964"}]})
            // peopleLib.justify()
            // resolve(peopleLib)
        })
    }

    /**
     * @param {ScanResult} scanResult 
     * @returns {Promise<Number>} 0 - error, 1 - success, 2 - nothing
     */
    async sendScanResult(scanResult){
        var usersIds = scanResult.absentList.map(x=>x.id)
        if(usersIds.length==0) return 2

        // var result = await this.makeGetApiCall("obtain_data", usersIds)
        this.lastScanId = 1
        var result = await this.makePostApiCall("obtain_data", usersIds)
        if(result.status=="ok"){
            this.lastScanId = result.data
        }
        return 0
    }

    /**
     * @returns {Promise<Number>} 0 - error, 1 - success, 2 - nothing
     */
    async notifyUsers(){
        //TODO: finish this
        if(!this.lastScanId) return 2
        var result = await this.makeGetApiCall("notify_user/?data=" + this.lastScanId)
        if(result.status=="ok"){
            return 1
        }
        return 0
    }

    /**
     * @param {Person} person
     */
    async notifyPerson(person){
        // there is no such method dumbass
    }
}