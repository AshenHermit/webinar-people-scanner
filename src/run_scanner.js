document.onreadystatechange = function () {
    if (document.readyState == "interactive") {
        // ready()
    }
}

function ready(){
    startSetupDeamon("UI", setupUserInterface)
}

ready()