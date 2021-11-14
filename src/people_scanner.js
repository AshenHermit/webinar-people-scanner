var tabContentClassName = "StreamPeople__tabContent___ZQ7G6"
var streamPeopleTabClassName = "StreamPeople__tab___EWMh4"

var globalConfig = window.people_scanner_api_config
var globalAppId = window.people_scanner_app_id

class ClientRemoteApi extends RemoteApi{
    constructor(api_server, extension_id){
        super(api_server)
        this.extension_id = extension_id
        console.log(this.extension_id)
    }

    /**
     * @param {String} method 
     * @param {Array} args 
     * @param {object} dataClass 
     * @returns {Any}
     */
    async executeMethodRemotely(method, args, dataClass){
        console.log(method, args, dataClass)
        return new Promise((resolve, reject)=>{
            chrome.runtime.sendMessage(
                this.extension_id, {action: "executeMethod", method: method, args: JSON.stringify(args)}, {},
                function(response) {
                    response = JSON.parse(response)

                    console.log(response)
                    var resJson = response.json
                    if(resJson){
                        /**@type {Exportable} */
                        var data = new dataClass()
                        var rawData = JSON.parse(resJson)
                        data.importData(rawData)
                        resolve(data)
                    }else{
                        reject(response)
                    }
                }
            );
        })
    }
    
    /** @returns {Promise<PeopleLibrary>} */
    async getGroupMembers(){
        return await this.executeMethodRemotely("getGroupMembers", [], PeopleLibrary)
    }
}


class PeopleScanner{
    constructor(){
        this.api = new ClientRemoteApi(globalConfig.api_server, globalAppId)

        /**@type {PeopleLibrary} */
        this.groupMembers = []
        /**@type {ScanResult} */
        this.prevScanResult = new ScanResult()
    }

    async setup(){
        var success = this.api.auth(globalConfig.token)
        try{
            this.groupMembers = await this.api.getGroupMembers()
        }catch(e){

        }
    }

    async fetchPeopleList(){
        return new Promise((resolve, reject)=>{
            var content = document.getElementsByClassName(tabContentClassName)[0]
            var peopleList = content.children[0].children[1].children[1].children[0].children[0]
            var scanInterval = 0
            var people = {}
            
            function scanPeople(){
                Array.from(peopleList.children).forEach(personEl=>{
                    people[personEl.innerText] = personEl.innerText
                })
            }

            content.scrollTo(0,0)
            scanPeople()
            scanInterval = setInterval(()=>{
                scanPeople()
                //stop if scrolled to bottom
                if(content.scrollTop+content.clientHeight+1 >= content.scrollHeight){
                    clearInterval(scanInterval)
                    resolve(Object.values(people))
                }
                content.scrollBy(0, content.clientHeight/2)
            }, 10)
        })
    }

    webinarNameToNorimalized(personName){
        personName = personName.split("\n")[0]
        var personNameParts = personName.split(" ")
        var name = personNameParts[0]
        var surname = personNameParts[personNameParts.length-1]
        var normalizedName = `${surname} ${name}`
        return normalizedName
    }

    async scanPeople() {
        var peopleList = await this.fetchPeopleList()

        var result = new ScanResult()

        result.presentList = peopleList
            .map(this.webinarNameToNorimalized)
            .map(Person.justifyName)
            .filter(x=>this.groupMembers.hasPerson(x))
            .sort()
            .map(this.groupMembers.getPersonByName.bind(this.groupMembers))

        result.absentList = this.groupMembers.people
            .filter(x=>result.presentList.indexOf(x)==-1)

        result.addedItemsList = result.presentList
            .filter(x=>this.prevScanResult.presentList.indexOf(x)==-1)

        result.removedItemsList = this.prevScanResult.presentList
            .filter(x=>result.presentList.indexOf(x)==-1)

        
        console.log(result)
        this.prevScanResult = result

        return result
    }
}

class PeopleScannerControls{
    constructor(instancePath, uiContainer){
        this.instancePath = instancePath
        this.uiContainer = uiContainer
        /**@type {PeopleScanner} */
        this.scanner = new PeopleScanner()
        /**@type {ScanResult} */
        this.scanResult = new ScanResult()
    }

    emptyOrText(text){
        if(text.trim().length==0) return '<div style="opacity: 0.5;">-пусто-</div>'
        else return text
    }

    /**
     * @param {Array<Person>} people 
     * @returns {String}
     */
    generateVkIdsList(people){
        if(!people) return ""
        if(people.length==0) return ""
        return `<textarea rows=1 style="border:0; width:100%; opacity:0.7; font-size:0.6em; margin-bottom: 8px;">${
            this.emptyOrText(people.map(x=>"@"+x.vk_shortname).join(", "))
        }</textarea>`
    }

    renderHTML(){
        var html =  `<h3>Счетчик присутствующих / отсутствующих</h3>
            <button style="border: 0; padding: 0.5em;" onclick='${this.instancePath}.scanPeople();'>Сканировать</button>
            <br/><br/>

            <h3>Список присутствующих [${this.scanResult.presentList.length}]</h3>
            ${this.generateVkIdsList(this.scanResult.presentList)}
            <div>${this.emptyOrText(this.scanResult.presentList.map(x=>x.name).join("<br/>"))}</div>

            <br/>
            <h3>Список отсутствующих [${this.scanResult.absentList.length}]</h3>
            ${this.generateVkIdsList(this.scanResult.absentList)}
            <div>${this.emptyOrText(this.scanResult.absentList.map(x=>x.name).join("<br/>"))}</div>

            <br/>
            <br/>
            <h3>Пришли [${this.scanResult.addedItemsList.length}]<br/><span style="opacity: 0.5; font-size: 0.8em;">(c момента последнего сканирования)</span></h3>
            <div>${this.emptyOrText(this.scanResult.addedItemsList.map(x=>x.name).map(x=>"+ "+x).join("<br/>"))}</div>
            <br/>
            <h3>Ушли [${this.scanResult.removedItemsList.length}]</h3>
            <div>${this.emptyOrText(this.scanResult.removedItemsList.map(x=>x.name).map(x=>"- "+x).join("<br/>"))}</div>

            <br/>
            `
        return html
    }
    updateUI(){
        this.uiContainer.innerHTML = this.renderHTML()
    }
    async scanPeople(){
        this.scanResult = await this.scanner.scanPeople()
        this.updateUI()
    }
    async start(){
        await this.scanner.setup()
        await this.updateUI()
    }
}

function createUIContainer(){
    var uiContainer = document.createElement("DIV")
    uiContainer.style.overflowY = "auto"
    uiContainer.style.height = "calc(100%)"
    uiContainer.style.padding = "2em"
    uiContainer.style.boxShadow = "0 -10px 11px -10px rgb(0 0 0 / 5%)"
    return uiContainer
}

function setupUserInterface(){
    var container = document.getElementsByClassName(streamPeopleTabClassName)[0]
    if (container){
        container.style.height = "50%"
        var uiContainer = createUIContainer()
        container.appendChild(uiContainer)

        var instanceName = "people_scanner_instance"
        var peopleScanner = new PeopleScannerControls("window."+instanceName, uiContainer)
        window.people_scanner_instance = peopleScanner
        peopleScanner.start()
        return true
    }
    else{
        return false
    }
}