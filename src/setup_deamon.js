class SetupDeamon{
    constructor(func){
        this.func = func
        this.working = true
        this.interval = 0
    }
    update(){
        var result = this.func()
        if(result){
            this.working = false
            this.stop()
        }
    }
    start(){
        this.interval = setInterval(this.update.bind(this), 100)
    }
    stop(){
        clearInterval(this.interval)
    }
}
var setupRegistry = {}
function startSetupDeamon(deamonId, func){
    setupRegistry[deamonId] = new SetupDeamon(func)
    setupRegistry[deamonId].start()
}