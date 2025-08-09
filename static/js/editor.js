class Item {
    constructor(name, description, parent, attributes, url, task, allowedTypes, alternatives=[]) {
        this.name = name
        this.description = description
        this.parent = parent
        this.attributes = attributes
        this.url = `static/tiles/${url}`
        this.task = Number(task)
        this.allowedTypes = allowedTypes
        this.alternatives = alternatives
        this.custom = false

        this.allowedTypes.push("custom")
        alternatives.forEach((item) => {item.url = `static/tiles/${item.url}`})

    }
}

const tools = {
    "Eraser": new Item("Eraser", "Erase tiles you previously drew.", "", [], "Eraser.png", 0, ["topdown", "platformer"]),
    "Player": new Item("Player", "Draw where the player appears when the level is loaded.", "", [], "Player.png", 0, ["topdown", "platformer"]),
    "Customizer": new Item("Customizer", "Create and manage custom tiles.", "", [], "Custom.png", 0, ["topdown", "platformer"]),
    "CSV Editor": new Item("CSV Editor", "Manually edit the level's CSV output.", "", [], "BackgroundTool.png", 0, ["topdown", "platformer"]),
}

let toolbarLookup = {...tools}

let items = {}

let failed = []

const selector = `static/tiles/Selector.png`

let toolbar = document.getElementById("toolbar")
let level = document.getElementById("level")

let types = {}

let globalBackgrounds = {}

let backgroundFname = "Grass.png"
let bgTiled= false

let activeItem = ""
let type = ""
let task = 0
let board = []

let playerLocation = ["",""]

let customConfig = {}

const randomColors = ["#F94144", "#F3722C", "#F8961E", "#F9C74F", "#90BE6D", "#43AA8B", "#577590"]

initEditor()

if (localStorage.getItem("theme") === "dark") {
    setDarkMode(true)
    document.getElementById("dark-mode").checked = true
} else {
    setDarkMode(false)
    document.getElementById("dark-mode").checked = false
}

function initEditor() {
    document.getElementById("name").value = ""
    document.getElementById("width").value = 12
    document.getElementById("height").value = 8
    document.getElementById("zoom").value = 50
    document.getElementById("csv-entry").value = ""
    document.getElementById("eraser-button").addEventListener("click", (event) => {setActiveItem(event)})
    document.getElementById("player-button").addEventListener("click", (event) => setActiveItem(event))
    document.getElementById("custom-button").addEventListener("click", (event) => setActiveItem(event))
    document.getElementById("csv-button").addEventListener("click", (event) => setActiveItem(event))
    const reset = document.getElementById("reset")
    reset.addEventListener("click", resetLevel)

    const exportBtn = document.getElementById("export")
    exportBtn.addEventListener("click", exportLevel)

    const taskSelect = document.getElementById("task")
    taskSelect.addEventListener("change", () => {
        task = Number(taskSelect.value)
        if (activeItem === "" || toolbarLookup[activeItem].task > task) {
            activeItem = ""
        }
        renderToolbar()
        renderAttributes()
    })

    const typeSelect = document.getElementById("type")
    typeSelect.addEventListener("change", () => {
        type = typeSelect.value
        renderToolbar()
        if (activeItem === "" || !toolbarLookup[activeItem].allowedTypes.includes(type)) {
            activeItem = ""
        }
        if (type === "custom") {
            document.getElementById("custom-type-container").style.display = "block"
        } else {
            document.getElementById("custom-type-container").style.display = "none"
            document.getElementById("type-name").value = types[type]
        }

        renderAttributes()
    })
    fetch("static/editor.json").then(
        (response) => {
            return response.json()
        }).then(data => {
            initTasks(data["tasks"])
            initTypes(data["types"])
            initItems(data["items"])
            resetLevel()
            initBackgrounds(data["backgrounds"])
        renderToolbar()
        })
}

function initBackgrounds(backgrounds) {
    let selector = document.getElementById("background-select")
    for (let background of backgrounds) {
        let select = document.createElement("option")
        select.value = background["filename"]
        select.textContent = background["filename"]
        globalBackgrounds[background["filename"]] = background["tiled"]
        selector.append(select)
    }
    let custom = document.createElement("option")
    custom.value = "Custom"
    custom.textContent = "Custom"
    selector.append(custom)
    let lvlDefault = document.createElement("option")
    lvlDefault.value = "Default"
    lvlDefault.textContent = "Default"
    selector.prepend(lvlDefault)
    selector.children[0].selected = true
    selector.addEventListener("change", (event) => {
        changeBackground(event.target.value)
    })
    changeBackground(selector.children[0].value)
}

function changeBackground(to) {
    if (to === "Custom" || to === "Default") {
        document.getElementById("background-options").style.display = to === "Custom" ? "block" : "none"
        document.getElementById("level").style.backgroundImage = "url('static/tiles/Grass.png')"
    } else {
        document.getElementById("background-options").style.display = "none"
        document.getElementById("bg-filename").value = to
        document.getElementById("bg-tiled").checked = globalBackgrounds[to]
        bgTiled = globalBackgrounds[to]
        document.getElementById("level").style.backgroundImage = `url('static/tiles/${to}')`
    }
}

function initTasks(tasks) {
    let dropdown = document.getElementById("task")
    for (let i = 0; i < tasks.length; i++) {
        let task = document.createElement("option")
        task.value = (i+1).toString()
        task.textContent = tasks[i]
        dropdown.append(task)
    }
    task = dropdown.children.length
    dropdown.children[dropdown.children.length-1].selected = true
}

function initTypes(loadedTypes) {
    types = loadedTypes
    let dropdown = document.getElementById("type")
    for ([id, prettyName] of Object.entries(loadedTypes)) {
        let type = document.createElement("option")
        type.value = id
        type.textContent = prettyName
        dropdown.append(type)
    }
    let opt = document.createElement("option")
        opt.value = "custom"
        opt.textContent = "Custom"
        dropdown.append(opt)
    type = dropdown.children[0].value
    document.getElementById("type-name").value = types[type]
    dropdown.children[0].selected = true
}

function initItems(loadedItems) {
    items = loadedItems
    for ([item, itemEntry] of Object.entries(loadedItems)) {
        if ("alternatives" in itemEntry) {
            items[item] = new Item(item, itemEntry["description"],
            itemEntry["parent"], itemEntry["attributes"], itemEntry["url"],
            itemEntry["task"], itemEntry["allowedTypes"], itemEntry["alternatives"])
        } else {
            items[item] = new Item(item, itemEntry["description"],
            itemEntry["parent"], itemEntry["attributes"], itemEntry["url"],
            itemEntry["task"], itemEntry["allowedTypes"])
        }
    }
    toolbarLookup = {...tools, ...items}
}

function setDarkMode(to) {
    document.getElementById("dark-mode-style").disabled = !to
    localStorage.setItem("theme", to ? "dark" : "light")
}

function renderToolbar() {
    Array.from(document.getElementsByTagName("div")).filter((el) => { return el.dataset.type === "tb-tile" }).forEach((el) => el.remove())

    let legalItems = Object.entries(items).filter(([item, itemInstance]) => {
        return (itemInstance.task <= task && itemInstance.allowedTypes.includes(type) && !Object.keys(tools).includes(item))
    })
    for (const [item, itemInstance] of legalItems) {
        const toolbarItem = document.createElement("div")
        toolbarItem.className = "toolbar-item"
        toolbarItem.textContent = itemInstance.name
        toolbarItem.style.backgroundImage = `url(${itemInstance.url})`
        toolbarItem.dataset.type = "tb-tile"

        toolbarItem.addEventListener("click", setActiveItem)

        if (item === activeItem) {
            const selector = document.createElement("div")
            selector.id = "selector"
            selector.style.backgroundImage = "url(" + selector + ")"
            toolbarItem.append(selector)
        }
        toolbar.append(toolbarItem)
    }
}

function renderAttributes() {
    if (!Object.keys(toolbarLookup).includes(activeItem)) {
        document.getElementById("attributes-section").innerHTML = "<h2>Level Editor</h2><p class=\"center\">Click on a tile to start drawing it.</p><p class=\"center\">Left Click - Draw</p> <p class=\"center\">Right Click - Erase</p>"
        return
    }
    let attributesSec = document.getElementById("attributes-section")
    attributesSec.innerHTML = ""
    let heading = document.createElement("h2")
    let parent = document.createElement("h4")
    let description = document.createElement("p")
    let attributes = document.createElement("div")
    attributes.id = "attributes"
    heading.textContent = toolbarLookup[activeItem].name
    parent.textContent = `${toolbarLookup[activeItem].parent}`
    description.textContent = toolbarLookup[activeItem].description
    attributesSec.append(heading, parent, description)
    if (activeItem === "Player") {
        document.getElementById("player-info").style.display = "block"
    } else {
        document.getElementById("player-info").style.display = "none"
    }

    if (activeItem === "Customizer") {
        document.getElementById("customizer").style.display = "block"
    } else {
        document.getElementById("customizer").style.display = "none"
    }
    toolbarLookup[activeItem].attributes.forEach((item) => {
        let label = document.createElement("label")
        let input = document.createElement("input")
        label.for = item.name
        label.textContent = item.name
        input.id = item.name
        input.name = item.name
        input.type = item.inputType
        input.value = item.defaultVal

        input.oninput = (item) => {
            let legal = /[a-z]|[0-9]|[\s!@#$%^&*()\-_+=.?~`]/i
            item.target.value = Array.from(item.target.value).filter((character) => {
                    return legal.test(character)
            }).join('')
        }
        if (item.inputType !== "text") {
            input.size = 5
        }
        if (item.name === "Filename") {
            input.value = backgroundFname
            input.addEventListener("change", (event) => {
                backgroundFname = event.target.value
            })
        }

        input.className = "attribute"

      attributes.append(label, document.createElement("br"), input, document.createElement("br"))
    })

    if (toolbarLookup[activeItem].alternatives.length !== 0) {
        let tb = document.createElement("div")
        tb.id = "sprite-toolbar"
        let label = document.createElement("label")
        let select = document.createElement("select")
        label.for = "alternatives-select"
        label.textContent = "Sprite"
        select.disabled = true
        toolbarLookup[activeItem].alternatives.forEach((item) => {
            let tile = document.createElement("div")
            tile.style.backgroundImage = `url(${item.url})`
            tile.className = "toolbar-item"
            tile.textContent = item.displayName
            tb.append(tile)
            tile.addEventListener("click", () => {
                document.getElementById("alternatives-select").value = item.value
                if (document.getElementById("alternatives-selector") != null) {
                    document.getElementById("alternatives-selector").remove()
                }
                let selector = document.createElement("div")
                selector.id = "alternatives-selector"
                tile.append(selector)
            })

            tb.append(tile)


            let option = document.createElement("option")
            option.value = item.value
            option.name = item.displayName
            option.textContent = item.displayName
            select.append(option)
            select.className = "attribute"
            select.name = "alternatives-select"
            select.id = "alternatives-select"
        })
        let selector = document.createElement("div")
        selector.id = "alternatives-selector"
        tb.children[0].append(selector)
        attributes.append(label, select, tb, document.createElement("br"))
    }

    attributesSec.append(attributes)
}

function customizerAdd() {
    let name = document.getElementById("custom-name").value
    let parent = document.getElementById("custom-parent").value
    if (name === "" || parent === "") {
        return
    }
    addCustomItem(name, parent, document.getElementById("custom-color").value)
}

function addCustomItem(name, parent, color) {
    let item = new Item(
        name,
        "",
        parent,
        [
        {
        "name": "Attributes",
        "defaultVal": "",
        "inputType": "text"
        }],
        "", 0, Object.keys(types)
    )
    item.url = `\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' height='80px' width='80px'><rect x='0' y='0' width='500px' height='500px' fill='${encodeURIComponent(color)}'></rect><text x='5' y='40' fill='white' font-size='20' font-family='sans-serif' font-weight='bold'>${name}</text></svg>\"`
    item.custom = true
    toolbarLookup[name] = item
    items[name] = item
    customConfig[name] = item
    renderToolbar()
}

function setPlayerLocation(x=playerLocation[0], y=playerLocation[1]) {
    if (document.getElementById("player") != null) {
        const prev = document.getElementById("player")
        prev.id = ""
        prev.style.removeProperty("background-image")
        prev.textContent = " "
        board[Number(prev.dataset.y)][Number(prev.dataset.x)] = ""
    }
    document.getElementById("player-x").value = x
    document.getElementById("player-y").value = y
    playerLocation = [x, y]
}

function setActiveItem(event) {
    let prevItem = activeItem
    let item = event.currentTarget
    if (document.getElementById("selector") != null) {
        document.getElementById("selector").remove()
    }
    const selector = document.createElement("div")
    selector.id = "selector"
    selector.style.backgroundImage = "url(" + selector + ")"
    item.append(selector)
    activeItem = toolbarLookup[item.textContent].name
    renderAttributes()
    if (prevItem === "CSV Editor" && toolbarLookup[event.currentTarget.textContent].name !== "CSV Editor") {
        toggleCSVEditor(false)
    } else if (activeItem === "CSV Editor") {
        toggleCSVEditor(true)
    }
}

function exportCustom() {
    let lvlName = document.getElementById("name").value === "" ? "level" : document.getElementById("name").value
    let filename = lvlName + "-config.json"
    const json = JSON.stringify(customConfig, null, 4)
    const file = new Blob([json], {type: "application/json"})
    const link = document.createElement("a")
    link.href = URL.createObjectURL(file)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

function importCustom(file) {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => {
        let json = JSON.parse(reader.result.toString())
        customConfig = {...customConfig, ...json}
        toolbarLookup = {...toolbarLookup, ...json}
        items = {...items, ...json}
        renderToolbar()
    }
}

function mouseDownEvent(event) {
    event.preventDefault();
    if (activeItem === "" || activeItem === "Customizer") {
        return
    }
    if (activeItem === "Eraser") {
        eraseEvent(event)
        level.addEventListener("mouseover", eraseEvent)
        return
    }

    if (event.button === 0) {
        drawEvent(event)
        level.addEventListener("mouseover", drawEvent)
    } else if (event.button === 2) {
        eraseEvent(event)
        level.addEventListener("mouseover", eraseEvent)
    }
}

function toolHandler(event) {
    switch (activeItem) {
        case "Eraser":
            eraseEvent(event)
            level.addEventListener("mouseover", eraseEvent)
            break
        case "Player":
            setPlayerLocation(event.target.dataset.x, event.target.dataset.y)
            event.target.id = "player"
            break
    }
}

function drawEvent(event) {
    if (event.target.className === "box") {
        if (Object.keys(tools).includes(activeItem)) {
            toolHandler(event)
        }
        if (toolbarLookup[activeItem].alternatives.length !== 0) {
            let alternative = toolbarLookup[activeItem].alternatives.find((item) => {
                return item.value === document.getElementById("alternatives-select").value
            })
            event.target.style.backgroundImage = "url(" + alternative.url + ")"
        } else {
            event.target.style.backgroundImage = "url(" + toolbarLookup[activeItem].url + ")"
        }
        event.target.textContent = toolbarLookup[activeItem].name
        event.target.dataset.type = "tile"



        const attributes = document.getElementsByClassName("attribute").length !== 0 && !(toolbarLookup[activeItem].custom && document.getElementById("Attributes").value.length === 0) ? "," + Array.from(document.getElementsByClassName("attribute")).map((element) => element.value).reduce((a, b) => a + "," + b) : ""
        board[Number(event.target.dataset.y)][Number(event.target.dataset.x)] = toolbarLookup[activeItem].parent + "," + toolbarLookup[activeItem].name + "," + event.target.dataset.x + "," + event.target.dataset.y + attributes + "\n"
    }
    level.addEventListener("mouseup", () => {
        level.removeEventListener("mouseover", drawEvent)
    })
}

function eraseEvent(event) {
    if (event.target.className === "box") {
        event.target.style.removeProperty("background-image")
        event.target.textContent = " "
        board[Number(event.target.dataset.y)][Number(event.target.dataset.x)] = ""
    }
    level.addEventListener("mouseup", () => {
        level.removeEventListener("mouseover", eraseEvent)
    })
}

function toggleCSVEditor(to) {
    if (to) {
        document.getElementById("csv-editor").style.display = "block"
        document.getElementById("level").style.display = "none"
        document.getElementById("zoom-box").style.display = "none"
        document.getElementById("visual-mode-controls").style.display = "none"
        document.getElementById("toolbar-settings").style.display = "none"
        document.getElementById("csv-entry").value = levelToCSV()
    } else {
        document.getElementById("csv-editor").style.display = "none"
        document.getElementById("level").style.display = "block"
        document.getElementById("zoom-box").style.display = "flex"
        document.getElementById("visual-mode-controls").style.display = "block"
        document.getElementById("toolbar-settings").style.display = "block"
        csvToLevel(document.getElementById("csv-entry").value)
    }
}

function resetLevel() {
    failed = []
    document.getElementById("level").remove()
    const nlevel = document.createElement("div")
    nlevel.id = "level"
    for (let y = 0; y < document.getElementById("height").value; y++) {
        const row = document.createElement("div")
        row.className = "row"
        for (let x = 0; x < document.getElementById("width").value; x++) {
            const tile = document.createElement("div")
            tile.className = "box"
            tile.textContent = " "
            tile.dataset.x = x.toString()
            tile.dataset.y = y.toString()
            row.append(tile)
        }
        nlevel.append(row)
    }
    nlevel.addEventListener("mousedown", mouseDownEvent)
    nlevel.addEventListener("contextmenu", (e) => {
        e.preventDefault()
    })
    document.getElementById("level-container").prepend(nlevel)
    level = nlevel
    changeBackground(document.getElementById("background-select").value)
    board = Array(Number(document.getElementById("height").value)).fill("").map(() => Array(Number(document.getElementById("width").value)).fill(""))
    setPlayerLocation("", "")
    if (activeItem === "CSV Editor") {
        document.getElementById("level").style.display = "none"
        document.getElementById("zoom-box").style.display = "none"
        document.getElementById("csv-editor").style.display = "block"
        document.getElementById("csv-entry").value = levelToCSV()
    }
}

function importLevel(file) {
    try {
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = () => {
            let result = reader.result.toString()
            if (activeItem === "CSV Editor" && validateCSV(result)) {
                document.getElementById("csv-entry").value = reader.result.toString()
                sendAlert("Imports are not processed (including error handling) until you leave CSV Editor mode.")
            } else if (!validateCSV(result)) {
                sendAlert("Failed to parse level. Provided file does not match level format.")
            } else {
                csvToLevel(reader.result.toString())
            }
        }
    } catch (e) {
        sendAlert(`Catastrophic failure to import level: ${e}.`)
    }
}

function validateCSV(csv) {
    const lines = csv.split("\n")
    if (lines.length < 2) {
        return false
    }
    if (lines[0].split(',').length !== 4) {
        return false
    }
    return lines[1].split(',')[0] === "PlayerStartLocation";

 }

function csvToLevel(csv) {
    if (!validateCSV(csv)) {
        sendAlert("Failed to parse level. Provided file does not match level format.")
        return
    }
    try {
        const lvl = csv.split("\n")
        const typeSelect = document.getElementById("type")
        const selType = Object.keys(types).find((type) => {return types[type] === lvl[0].split(',')[0]})
        if (selType !== undefined) {
            typeSelect.value = selType
            type = selType
            document.getElementById("custom-type-container").style.display = "none"
            document.getElementById("type-name").value = types[selType]
        } else {
            typeSelect.value = "custom"
            type = "custom"
            document.getElementById("custom-type-container").style.display = "block"
            document.getElementById("type-name").value = lvl[0].split(',')[0]
        }
        document.getElementById("name").value = lvl[0].split(',')[1]
        document.getElementById("width").value = lvl[0].split(',')[2]
        document.getElementById("height").value = lvl[0].split(',')[3]
        resetLevel()

        if (lvl[1].split(',')[0] !== "PlayerStartLocation" || lvl[1].split(',').length < 3 || isNaN(Number(lvl[1].split(',')[1])) || isNaN(Number(lvl[1].split(',')[2]))) {
            sendAlert("Failed to parse player start location.")
            setPlayerLocation("","")
        } else {
            let width = lvl[1].split(',')[1]
            let height = lvl[1].split(',')[2]
            setPlayerLocation(width, height)

            if (lvl[1].split(',')[1] !== "" && lvl[1].split(',')[2] !== "") {
                if (Number(width) === Math.floor(Number(width)) && Number(height) === Math.floor(Number(height))) {
                    board[height][width] = `,Player,${width},${height}`
                } else {
                    sendAlert("Player start location parsed, but will not be displayed in visual mode.")
                }
            }
        }
        let contentStart = 3
        if (lvl[2].split(',')[0] !== "BackgroundTile" && lvl[2].split(',')[0] !== "BackgroundImage") {
            document.getElementById("background-select").value = "Default"
            document.getElementById("background-select").dispatchEvent(new Event("change"))
            contentStart = 2
        } else {
            let bgFilename = lvl[2].split(',')[1].replace("\n","")
            document.getElementById("bg-filename").value = bgFilename
            document.getElementById("bg-tiled").checked = lvl[2].split(',')[0] === "BackgroundTile"
            if (Object.keys(globalBackgrounds).includes(bgFilename)) {
                document.getElementById("background-select").value = bgFilename
            } else {
                document.getElementById("background-select").value = "Custom"
            }
            document.getElementById("background-select").dispatchEvent(new Event("change"))
        }

        failed = []

        for (let line of lvl.slice(contentStart)) {
            if (line !== "") {
                for (let line of lvl.slice(contentStart)) {
                if (line !== "") {
                    let width = line.split(',')[2]
                    let height = line.split(',')[3]
                    if (isNaN(Number(width)) || isNaN(Number(height))) {
                        failed.push(line)
                    } else {
                        board[height][width] = line + "\n"
                    }
                }
        }

            }
        }
        for (let y = 0; y < board.length; y++) {
            for (let x = 0; x < board[y].length; x++) {
                if (board[y][x] !== "") {
                    const div = document.getElementById("level").children[y].children[x]
                    if (!(board[y][x].split(',')[1] in toolbarLookup)) {
                        addCustomItem(board[y][x].split(',')[1], board[y][x].split(',')[0], randomColors[Math.floor(Math.random() * randomColors.length)])
                        div.style.backgroundImage = `url(${items[board[y][x].split(',')[1]].url})`
                    } else {
                        let item = toolbarLookup[board[y][x].split(',')[1]]
                        if (item.name === "Player") {
                            div.id = "player"
                        }
                        if (item.alternatives.length !== 0) {
                        let alternative = item.alternatives.find((item) => {
                            let entry = board[y][x].split(',')
                            return item.value === entry[entry.length-1].replace("\n", "")
                        })
                        div.style.backgroundImage = `url(${alternative.url})`
                        } else (
                            div.style.backgroundImage = `url(${item.url})`
                        )
                    }
                }
            }
        }
        renderToolbar()
        if (failed.length > 0) {
            sendAlert(`Failed to parse ${failed.length} ${failed.length === 1 ? "line" : "lines"}. The offending ${failed.length === 1 ? "line" : "lines"} can be viewed and modified at the bottom of the CSV editor.`)
        }
    } catch (e) {
        sendAlert(`Level import failed: ${e}`)
        initEditor()
    }

}

function levelToCSV() {
    let lvlName = document.getElementById("name").value === "" ? "level" : document.getElementById("name").value
    let out = ""
    let startLocation = playerLocation
    for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x].split(",")[1] !== "Player") {
                out += board[y][x]
            }
        }
    }
    let lvlTypePrettyName = document.getElementById("type-name").value

    let bgName = document.getElementById("bg-filename").value

    if (document.getElementById("background-select").value === "Default") {
        out = `${lvlTypePrettyName},${lvlName},${board[0].length},${board.length}\nPlayerStartLocation,${startLocation[0]},${startLocation[1]}\n` + out
    } else {
        out = `${lvlTypePrettyName},${lvlName},${board[0].length},${board.length}\nPlayerStartLocation,${startLocation[0]},${startLocation[1]}\n${bgTiled ? "BackgroundTile" : "BackgroundImage"},${bgName}\n` + out
    }
    failed.forEach((line) => {out += `${line}\n`})

    return out
}



function exportLevel() {
    let out = ""
    let lvlName = ""
    if (activeItem === "CSV Editor") {
        out = document.getElementById("csv-entry").value
        lvlName = out.split('\n')[0].split(',')[1]
    } else {
        out = levelToCSV()
        lvlName = document.getElementById("name").value === "" ? "level" : document.getElementById("name").value
    }
    const link = document.createElement("a")
    const file = new Blob([out], {type: "text/plain"})
    link.href = URL.createObjectURL(file)
    link.download = lvlName + ".csv"
    link.click()
    URL.revokeObjectURL(link.href)
}

function sendAlert(text) {
    let alert = document.createElement("div")
    alert.textContent = text
    alert.id = "alert"
    document.getElementById("alert-container").prepend(alert)
    let close = document.createElement("span")
    close.textContent = "×"
    close.onclick = () => {alert.remove()}
    close.style.marginRight = "5px"
    close.style.cursor = "pointer"
    alert.prepend(close)

    setTimeout(() => {
        alert.style.opacity = "0"
    }, 5000)

    setTimeout(() => {
        alert.remove()
    }, 10000)
}