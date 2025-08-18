const randomColors = ["#F94144", "#F3722C", "#F8961E", "#F9C74F", "#90BE6D", "#43AA8B", "#577590"]

class Item {
    constructor(name, description, parent, attributes, url, task, allowedTypes, dimension, alternatives=[], custom=false, color=randomColors[Math.floor(Math.random() * randomColors.length)]) {
        this.name = name
        this.description = description
        this.parent = parent
        this.attributes = attributes
        this.url = url
        this.task = Number(task)
        this.allowedTypes = allowedTypes
        this.alternatives = alternatives
        this.width = Number(dimension.split("x")[0])
        this.height = Number(dimension.split("x")[1])
        this.image = new Image()
        this.custom = custom
        if (!this.custom) {
            this.image.src = url
        }
        this.color = color
        this.allowedTypes.push("custom")
    }
}

class Background {
    constructor(displayName, filename, imageFilename, tiled, col=undefined, row=undefined) {
        this.displayName = displayName
        this.filename = filename
        this.tiled = tiled
        this.image = new Image()
        this.image.src = `${imageFilename}`
        this.col = col
        this.row = row
        if (this.tiled) {
            this.image.width = 128
            this.image.height = 128
        }
    }
}

const tools = {
    "Eraser": new Item("Eraser", "Erase tiles you previously drew.", "", [], "static/tiles/Eraser.png", 0, ["topdown", "platformer"], "1x1",[], false),
    "Player": new Item("Player", "Draw where the player appears when the level is loaded.", "", [], "static/tiles/Player.png", 0, ["topdown", "platformer"], "1x1",[], false),
    "Customizer": new Item("Customizer", "Create and manage custom tiles.", "", [], "static/tiles/Custom.png", 0, ["topdown", "platformer"], "1x1",[], false),
    "CSV Editor": new Item("CSV Editor", "Manually edit the level's CSV output.", "", [], "static/tiles/BackgroundTool.png", 0, ["topdown", "platformer"], "1x1",[], false),
}

let toolbarLookup = {...tools}

let items = {}

let failed = []

const selector = `static/tiles/Selector.png`

let toolbar = document.getElementById("toolbar")

let types = {}


let globalBackgrounds = []
let bgMap = {}

const defaultBackground = new Background("default", "default", "static/tiles/Grass.png", true)
const customBackground = new Background("custom", "custom", "static/tiles/Grass.png", true)


let activeBackground = defaultBackground

let activeItem = ""
let type = ""
let task = 0

let customConfig = {}

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
    document.getElementById("zoom").value = 31
    document.getElementById("csv-entry").value = ""
    document.getElementById("eraser-button").addEventListener("click", (event) => {setActiveItem(event)})
    document.getElementById("player-button").addEventListener("click", (event) => setActiveItem(event))
    document.getElementById("custom-button").addEventListener("click", (event) => setActiveItem(event))
    document.getElementById("csv-button").addEventListener("click", (event) => setActiveItem(event))
    document.getElementById("hints").value = "ambiguous"
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
            initBackgrounds(data["backgrounds"])
        renderToolbar()
        }).then(() => {initCanvas(); resetCanvas()
        }).then(() => resetLevel())

    if (!localStorage.getItem("seen-new-editor-warning")) {
        localStorage.setItem("seen-new-editor-warning", true)
        const oldBtn = document.createElement("button")
        oldBtn.textContent = "Use Old Editor"
        oldBtn.addEventListener("click", () => {
            window.location.href = "/old"
        })

        sendAlert("Old editor will be removed very soon. Also this warning won't show again.", oldBtn, true)
    }
}

function initBackgrounds(backgrounds) {
    let selector = document.getElementById("background-select")
    for (let background of backgrounds) {
        let bg = new Background(background["displayName"], background["engineFilename"], background["localFilename"], background["tiled"])
        if (background["tiled"]) {
            bg = new Background(background["displayName"], background["engineFilename"], background["localFilename"], background["tiled"], background["col"], background["row"])
            bgMap[bg.displayName] = bg
            globalBackgrounds.push(bg)
        } else {
            bgMap[bg.displayName] = bg
            globalBackgrounds.push(bg)
        }

        let select = document.createElement("option")
        select.value = bg.displayName
        select.textContent = bg.displayName
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
        if (event.target.value === "Custom") {
            document.getElementById("background-options").style.display = "block"
        } else {
            document.getElementById("background-options").style.display = "none"
        }
        if (event.target.value === "Default") {
            activeBackground = defaultBackground
        } else if (event.target.value === "Custom") {
            activeBackground = customBackground
        } else {
            activeBackground = bgMap[event.target.value]
        }
        redrawCanvas()
        changeBackground(activeBackground)
    })
    activeBackground = globalBackgrounds[0]
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
            itemEntry["task"], itemEntry["allowedTypes"], itemEntry["dimension"], itemEntry["alternatives"], false)
        } else {
            items[item] = new Item(item, itemEntry["description"],
            itemEntry["parent"], itemEntry["attributes"], itemEntry["url"],
            itemEntry["task"], itemEntry["allowedTypes"], itemEntry["dimension"], [], false)
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

function resizeLevel() {
    lvlHeight = Number(document.getElementById("height").value)
    lvlWidth = Number(document.getElementById("width").value)

    let oob = Object.entries(levelMap).filter(([_, entry]) => { return entry.split(',')[2] >= lvlWidth || entry.split(',')[3] >= lvlHeight })

    redrawCanvas()
    manipulateCanvasMargin()

    function clearOOB() {
        for (const [item, _] of oob) {
            delete levelMap[item]
        }
        redrawCanvas()
        sendAlert("Cleared out of bounds tiles.")
    }

    if (Object.keys(oob).length !== 0) {
        const button = document.createElement("button")
        button.textContent = "Remove"
        button.addEventListener("click", clearOOB)
        sendAlert(`${Object.keys(oob).length} tile${Object.keys(oob).length === 1 ? "" : "s"} are out of bounds. They can be removed by pressing this button.`, button)
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

        if (toolbarLookup[activeItem].custom) {
            input.oninput = (item) => {
                let legal = /[a-z]|[0-9]|[\s!@#$%^&*()\-_+=.?~,'`]/i
                item.target.value = Array.from(item.target.value).filter((character) => {
                        return legal.test(character)
                }).join('')
            }
        } else {
            input.oninput = (item) => {
                let legal = /[a-z]|[0-9]|[\s!@#$%^&*()\-_+=.?~'`]/i
                item.target.value = Array.from(item.target.value).filter((character) => {
                        return legal.test(character)
                }).join('')
            }
        }

        if (item.inputType !== "text") {
            input.size = 5
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

function changeBackground(to) {
    if (to.filename === "custom") {
        document.getElementById("background-options").style.display = "block"
        if (document.getElementById("bg-tiled").checked) {
            document.getElementById("tile-controls").style.display = "block"
        } else {
            document.getElementById("tile-controls").style.display = "none"
        }
    } else {
        document.getElementById("background-options").style.display = "none"
        document.getElementById("bg-filename").value = to.filename
        document.getElementById("bg-tiled").checked = to.tiled
        if (to.tiled) {
            document.getElementById("bg-col").value = to.col
            document.getElementById("bg-row").value = to.row
        }
    }
}


function customizerAdd() {
    let name = document.getElementById("custom-name").value
    let parent = document.getElementById("custom-parent").value
    if (name === "" || parent === "") {
        return
    }
    addCustomItem(name, parent, document.getElementById("custom-color").value)
}

function addCustomItem(name, parent, color=randomColors[Math.floor(Math.random() * randomColors.length)]) {
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
        getSVGImageURL(name, color), 0, Object.keys(types),"1x1", [], true, color
    )
    item.custom = true
    toolbarLookup[name] = item
    items[name] = item
    customConfig[name] = item
    renderToolbar()
}

function getSVGImageURL(name, color) {
    return `\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' height='80px' width='80px'><rect x='0' y='0' width='500px' height='500px' fill='${encodeURIComponent(color)}'></rect><text x='5' y='40' fill='white' font-size='20' font-family='sans-serif' font-weight='bold'>${name}</text></svg>\"`
}

function setPlayerLocation(x=playerLocation[0], y=playerLocation[1]) {
    playerLocation = [x, y]
    if (x !== "" && y !== "") {
        drawTile(x, y, "Player")
    }
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
        for (let [_, item] of Object.entries(json)) {
            if ("color" in item) {
                addCustomItem(item.name, item.parent, item.color)
            } else {
                addCustomItem(item.name, item.parent)
            }
        }
    }
}

function toggleCSVEditor(to) {
    if (to) {
        document.getElementById("csv-editor").style.display = "block"
        document.getElementById("level-visual").style.display = "none"
        document.getElementById("zoom-box").style.display = "none"
        document.getElementById("visual-mode-controls").style.display = "none"
        document.getElementById("toolbar-settings").style.display = "none"
        document.getElementById("csv-entry").value = levelToCSV()
    } else {
        document.getElementById("csv-editor").style.display = "none"
        document.getElementById("level-visual").style.display = "block"
        document.getElementById("zoom-box").style.display = "flex"
        document.getElementById("visual-mode-controls").style.display = "block"
        document.getElementById("toolbar-settings").style.display = "block"
        csvToLevel(document.getElementById("csv-entry").value)
    }
}

function resetLevel() {
    failed = []
    resetCanvas()
    setPlayerLocation("", "")
    if (activeItem === "CSV Editor") {
        document.getElementById("level-visual").style.display = "none"
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
                if (Number(width) * 4 !== Math.floor(Number(width) * 4) || Number(height) * 4 !== Math.floor(Number(height) * 4)) {
                    sendAlert("Player start location parsed, but not located on a quarter tile. You will not be able to erase the tile outside of CSV mode.")
                }
            }
        }
        let contentStart = 3
        if (lvl[2].split(',')[0] !== "BackgroundTile" && lvl[2].split(',')[0] !== "BackgroundImage") {
            document.getElementById("background-select").value = "Default"
            document.getElementById("background-select").dispatchEvent(new Event("change"))
            contentStart = 2
        } else {
            let bgTiled = lvl[2].split(',')[0] === "BackgroundTile"
            let bgFilename = bgTiled ? lvl[2].split(',')[1].replace("\n","") : lvl[2].split(',').slice(1).join(',').replace("\n","")

            document.getElementById("bg-filename").value = bgFilename
            document.getElementById("bg-tiled").checked = bgTiled
            let bg
            if (bgTiled) {
                let col = Number(lvl[2].split(',')[2].replace("\n",""))
                let row = Number(lvl[2].split(',')[3].replace("\n",""))
                document.getElementById("bg-col").value = col
                document.getElementById("bg-row").value = row
                bg = globalBackgrounds.find((bg2) => {
                    return bg2.filename === bgFilename && bg2.tiled && bg2.col === col && bg2.row === row})
            } else {
                bg = globalBackgrounds.find((bg2) => {return bg2.filename === bgFilename && !bg2.tiled})
            }

            if (bg !== undefined) {
                document.getElementById("background-select").value = bg.displayName
                document.getElementById("background-select").dispatchEvent(new Event("change"))
                activeBackground = bg
            } else {
                document.getElementById("background-select").value = "Custom"
                document.getElementById("background-select").dispatchEvent(new Event("change"))
                activeBackground = customBackground
            }
        }

        failed = []
        let decimals = []

        for (let line of lvl.slice(contentStart)) {
            if (line !== "") {
                let width = line.split(',')[2]
                let height = line.split(',')[3]
                if (isNaN(Number(width)) || isNaN(Number(height))) {
                    failed.push(line)
                } else {
                    levelMap[`${width},${height}`] = `${line}\n`
                    if (!(line.split(',')[1] in toolbarLookup)) {
                        addCustomItem(line.split(',')[1], line.split(',')[0])
                    }
                    if (Number(line.split(',')[2]) * 4 !== Math.floor(Number(line.split(',')[2]) * 4) || Number(line.split(',')[3]) * 4 !== Math.floor(Number(line.split(',')[3]) * 4)) {
                        decimals.push(line)
                    }
                }
            }
        }
        renderToolbar()
        redrawCanvas()
        if (failed.length > 0) {
            sendAlert(`Failed to parse ${failed.length} ${failed.length === 1 ? "line" : "lines"}. The offending ${failed.length === 1 ? "line" : "lines"} can be viewed and modified at the bottom of the CSV editor.`)
        }
        if (decimals.length > 0) {
            sendAlert(`Tiles not located on a quarter tile increment cannot be modified in visual mode.`)
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
    for (let [_, entry] of Object.entries(levelMap)) {
        if (entry.split(',')[1] !== "Player") {
            out += entry
        }
    }

    let lvlTypePrettyName = document.getElementById("type-name").value

    let bgName = document.getElementById("bg-filename").value

    if (document.getElementById("background-select").value === "Default") {
        out = `${lvlTypePrettyName},${lvlName},${lvlWidth},${lvlHeight}\nPlayerStartLocation,${startLocation[0]},${startLocation[1]}\n` + out
    } else {
        let bgLine = document.getElementById("bg-tiled").checked ? "BackgroundTile" : "BackgroundImage"
        bgLine += `,${bgName}`
        if (document.getElementById("bg-tiled").checked) {
            bgLine += `,${document.getElementById("bg-col").value},${document.getElementById("bg-row").value}`
        }
        out = `${lvlTypePrettyName},${lvlName},${lvlWidth},${lvlHeight}\nPlayerStartLocation,${startLocation[0]},${startLocation[1]}\n${bgLine}\n` + out
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

function sendAlert(text, button=null, persistent=false) {
    let alert = document.createElement("div")
    let alertContainer = document.getElementById("alert-container")
    alert.textContent = text
    alert.className = "alert"
    alertContainer.prepend(alert)
    if (alertContainer.children.length > 3) {
        alertContainer.children[3].remove()
    }
    let close = document.createElement("span")
    close.textContent = "×"
    close.onclick = () => {alert.remove()}
    close.style.marginRight = "5px"
    close.style.cursor = "pointer"
    alert.prepend(close)

    if (button !== null) {
        alert.append(button)
    }

    if (!persistent) {
        setTimeout(() => {
            alert.style.opacity = "0"
        }, 5000)
            setTimeout(() => {
            alert.remove()
        }, 10000)
    }


}